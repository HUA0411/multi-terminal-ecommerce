// ============================================================
// CMS 区块：类型说明与默认 props（管理端编辑器与门店端渲染共用）
// 类型：banner | nav | goods | image | rich | video | notice
// ============================================================

export const BLOCK_TYPES = [
  { type: 'banner', name: '轮播 Banner' },
  { type: 'nav', name: '导航宫格' },
  { type: 'goods', name: '商品列表' },
  { type: 'image', name: '图片' },
  { type: 'rich', name: '富文本' },
  { type: 'video', name: '视频' },
  { type: 'notice', name: '公告' },
]

export const blockTypeName = (type) => {
  const t = BLOCK_TYPES.find((x) => x.type === type)
  return t ? t.name : type
}

export function defaultBlockProps(type) {
  switch (type) {
    case 'banner':
      return { images: [{ image: '', link: '' }], height: 320 }
    case 'nav':
      return { items: [{ name: '分类', link: '/products', icon: 'Grid' }] }
    case 'goods':
      return { title: '精选好物', categoryId: null, tag: '', goodsIds: '', count: 8 }
    case 'image':
      return { image: '', link: '', width: '100%', height: '' }
    case 'rich':
      return { content: '<p>请输入富文本内容…</p>' }
    case 'video':
      return { url: '', poster: '', title: '' }
    case 'notice':
      return { text: '欢迎光临云商城！', link: '', bgColor: '#fffbe6' }
    default:
      return {}
  }
}

/** 区块简要摘要（列表展示用） */
export function blockSummary(type, props = {}) {
  switch (type) {
    case 'banner':
      return `${(props.images || []).length} 张图片`
    case 'nav':
      return `${(props.items || []).length} 个入口`
    case 'goods':
      return props.title || '商品列表'
    case 'image':
      return props.image ? props.image.slice(0, 40) : '未设置图片'
    case 'rich':
      return '富文本内容'
    case 'video':
      return props.url || '未设置视频'
    case 'notice':
      return props.text || '公告文本'
    default:
      return ''
  }
}
