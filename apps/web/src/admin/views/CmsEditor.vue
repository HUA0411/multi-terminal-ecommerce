<template>
  <div class="cms-editor">
    <div class="admin-card">
      <div class="admin-toolbar">
        <el-button @click="router.push('/cms')"><el-icon><ArrowLeft /></el-icon> 返回列表</el-button>
        <span class="editor-title">{{ editingId ? '编辑页面' : '新建页面' }}</span>
        <div style="margin-left:auto;display:flex;gap:10px;align-items:center">
          <el-button @click="previewVisible = !previewVisible">
            <el-icon><View /></el-icon> {{ previewVisible ? '隐藏预览' : '实时预览' }}
          </el-button>
          <el-button type="success" :loading="saving" @click="save(false)">保存草稿</el-button>
          <el-button type="primary" :loading="saving" @click="save(true)">保存并发布</el-button>
        </div>
      </div>

      <el-form :model="form" label-width="90px" style="max-width:640px">
        <el-form-item label="页面 key" required>
          <el-input v-model="form.key" placeholder="如 home / about（门店端 GET /cms/pages/:key）" :disabled="!!editingId" />
        </el-form-item>
        <el-form-item label="页面标题" required>
          <el-input v-model="form.title" placeholder="页面标题" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="draft">草稿</el-radio>
            <el-radio value="published">已发布</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <el-divider content-position="left">页面区块（{{ blocks.length }}）</el-divider>

      <!-- 区块列表 -->
      <div class="blocks-area">
        <div v-if="!blocks.length" class="empty-tip">还没有区块，点击下方按钮添加</div>
        <div v-for="(b, i) in blocks" :key="i" class="block-item">
          <el-tag :type="tagType(b.type)" size="small" class="block-type">{{ blockTypeName(b.type) }}</el-tag>
          <span class="block-summary">{{ blockSummary(b.type, b.props) }}</span>
          <div class="ops">
            <el-button link type="primary" size="small" @click="editBlock(i)">编辑</el-button>
            <el-button link size="small" :disabled="i === 0" @click="move(i, -1)">上移</el-button>
            <el-button link size="small" :disabled="i === blocks.length - 1" @click="move(i, 1)">下移</el-button>
            <el-button link type="danger" size="small" @click="blocks.splice(i, 1)">删除</el-button>
          </div>
        </div>

        <el-dropdown style="margin-top:12px" @command="addBlock">
          <el-button type="primary" plain><el-icon><Plus /></el-icon> 添加区块</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="t in BLOCK_TYPES" :key="t.type" :command="t.type">{{ t.name }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <!-- 实时预览 -->
      <div v-if="previewVisible" class="preview-area">
        <el-divider content-position="left">门店端实时预览（1200px）</el-divider>
        <div class="preview-frame">
          <CmsRenderer :blocks="blocks" />
        </div>
      </div>
    </div>

    <!-- 区块属性编辑 -->
    <el-dialog v-model="blockDialog" :title="`编辑区块：${blockTypeName(editingBlock?.type)}`" width="640px">
      <el-form label-width="90px" v-if="editingBlock">
        <BlockPropsForm :type="editingBlock.type" :props="editingBlock.props" :categories="categories" />
      </el-form>
      <template #footer>
        <el-button @click="blockDialog = false">完成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import CmsRenderer from '../../components/cms/CmsRenderer.vue'
import BlockPropsForm from '../components/BlockPropsForm.vue'
import { cmsApi, productApi } from '../../api'
import { BLOCK_TYPES, blockTypeName, blockSummary, defaultBlockProps } from '../../utils/cmsBlocks'

const route = useRoute()
const router = useRouter()

const editingId = computed(() => (route.params.id ? Number(route.params.id) : null))

const form = reactive({ key: '', title: '', status: 'draft' })
const blocks = ref([])
const categories = ref([])

const blockDialog = ref(false)
const editingBlock = ref(null)
const previewVisible = ref(true)
const saving = ref(false)

const tagTypeMap = {
  banner: 'danger',
  nav: 'warning',
  goods: 'success',
  flashsale: 'danger',
  groupon: 'warning',
  image: 'info',
  rich: 'primary',
  video: 'primary',
  notice: 'warning',
}
function tagType(t) {
  return tagTypeMap[t] || 'info'
}

function addBlock(type) {
  blocks.value.push({ type, props: defaultBlockProps(type) })
}

function editBlock(i) {
  editingBlock.value = blocks.value[i]
  blockDialog.value = true
}

function move(i, dir) {
  const j = i + dir
  if (j < 0 || j >= blocks.value.length) return
  const arr = blocks.value
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}

async function load() {
  if (!editingId.value) return
  try {
    const list = await cmsApi.adminList()
    const arr = Array.isArray(list) ? list : list.list || []
    const page = arr.find((x) => Number(x.id) === editingId.value)
    if (page) {
      form.key = page.key || ''
      form.title = page.title || ''
      form.status = page.status || 'draft'
      blocks.value = (page.blocks || []).map((b) => ({
        type: b.type,
        props: { ...(b.props || {}) },
      }))
    } else {
      ElMessage.warning('未找到该页面，将以新建模式打开')
    }
  } catch {
    /* 拦截器已提示 */
  }
}

async function save(publish) {
  if (!form.key.trim() || !form.title.trim()) {
    ElMessage.warning('请填写页面 key 和标题')
    return
  }
  if (!blocks.value.length) {
    ElMessage.warning('请至少添加一个区块')
    return
  }
  saving.value = true
  const payload = {
    key: form.key.trim(),
    title: form.title.trim(),
    blocks: blocks.value,
    status: publish ? 'published' : form.status || 'draft',
  }
  try {
    if (editingId.value) {
      await cmsApi.update(editingId.value, payload)
    } else {
      await cmsApi.create(payload)
    }
    ElMessage.success(publish ? '已保存并发布' : '草稿已保存')
    if (!editingId.value) {
      // 新建成功后回到列表
      router.push('/cms')
      return
    }
  } catch {
    /* 拦截器已提示 */
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    categories.value = await productApi.categories()
  } catch {
    categories.value = []
  }
  load()
})
</script>

<style scoped>
.editor-title {
  font-size: 16px;
  font-weight: 600;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 30px 0;
}

.blocks-area {
  max-width: 900px;
}

.preview-area {
  margin-top: 20px;
}

.preview-frame {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 12px;
  min-height: 200px;
}
</style>
