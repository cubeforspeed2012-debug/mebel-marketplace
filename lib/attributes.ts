/**
 * Характеристики работы — то, по чему клиент ищет мебель.
 *
 * «Кухня» — слишком общо: человек ищет «кухню из МДФ в стиле лофт до
 * 3 метров». Раньше всё это лежало в свободном описании, и поиск по нему
 * не работал: кто-то писал «мдф», кто-то «MDF», кто-то ничего. Теперь
 * мастер выбирает из списка, а каталог фильтрует и ищет по этим полям.
 *
 * Ключи хранятся в базе (в attributes jsonb), подписи — здесь, на двух
 * языках. Менять ключи нельзя: по ним уже сохранены работы.
 */

export type Option = { key: string; ru: string; uz: string }

export const MATERIALS: Option[] = [
  { key: 'mdf', ru: 'МДФ', uz: 'MDF' },
  { key: 'ldsp', ru: 'ЛДСП', uz: 'LDSP' },
  { key: 'solid', ru: 'Массив дерева', uz: "Yog'och massivi" },
  { key: 'veneer', ru: 'Шпон', uz: 'Shpon' },
  { key: 'metal', ru: 'Металл', uz: 'Metall' },
  { key: 'glass', ru: 'Стекло', uz: 'Shisha' },
  { key: 'fabric', ru: 'Ткань / велюр', uz: 'Mato / velyur' },
  { key: 'leather', ru: 'Кожа / экокожа', uz: 'Teri / ekoteri' },
]

export const STYLES: Option[] = [
  { key: 'modern', ru: 'Современный', uz: 'Zamonaviy' },
  { key: 'classic', ru: 'Классика', uz: 'Klassika' },
  { key: 'loft', ru: 'Лофт', uz: 'Loft' },
  { key: 'minimal', ru: 'Минимализм', uz: 'Minimalizm' },
  { key: 'scandi', ru: 'Скандинавский', uz: 'Skandinav' },
  { key: 'neo', ru: 'Неоклассика', uz: 'Neoklassika' },
]

export const COLORS: Option[] = [
  { key: 'white', ru: 'Белый', uz: 'Oq' },
  { key: 'black', ru: 'Чёрный', uz: 'Qora' },
  { key: 'grey', ru: 'Серый', uz: 'Kulrang' },
  { key: 'wood', ru: 'Под дерево', uz: "Yog'och rang" },
  { key: 'beige', ru: 'Бежевый', uz: 'Bej' },
  { key: 'brown', ru: 'Коричневый', uz: 'Jigarrang' },
  { key: 'colored', ru: 'Цветной', uz: 'Rangli' },
]

export const ROOMS: Option[] = [
  { key: 'kitchen', ru: 'Кухня', uz: 'Oshxona' },
  { key: 'living', ru: 'Гостиная', uz: 'Mehmonxona' },
  { key: 'bedroom', ru: 'Спальня', uz: 'Yotoqxona' },
  { key: 'kids', ru: 'Детская', uz: 'Bolalar xonasi' },
  { key: 'hallway', ru: 'Прихожая', uz: 'Dahliz' },
  { key: 'office', ru: 'Офис', uz: 'Ofis' },
  { key: 'bathroom', ru: 'Ванная', uz: 'Hammom' },
  { key: 'outdoor', ru: 'Улица / терраса', uz: "Ko'cha / terrasa" },
]

/** Списки, по которым выбирают из вариантов. Порядок — как в форме и фильтрах. */
export const CHOICE_GROUPS = {
  room: { ru: 'Для какой комнаты', uz: 'Qaysi xona uchun', options: ROOMS },
  material: { ru: 'Материал', uz: 'Material', options: MATERIALS },
  style: { ru: 'Стиль', uz: 'Uslub', options: STYLES },
  color: { ru: 'Цвет', uz: 'Rang', options: COLORS },
} as const

export type ChoiceKey = keyof typeof CHOICE_GROUPS

export type ProductAttributes = {
  room?: string
  material?: string
  style?: string
  color?: string
  /** Размеры в сантиметрах */
  width_cm?: number
  height_cm?: number
  depth_cm?: number
  /** Срок изготовления, дней */
  made_days?: number
  delivery?: boolean
  installation?: boolean
}

const NUMBER_FIELDS = ['width_cm', 'height_cm', 'depth_cm', 'made_days'] as const
const FLAG_FIELDS = ['delivery', 'installation'] as const

function num(raw: FormDataEntryValue | null): number | undefined {
  const value = Number(String(raw ?? '').replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(value) && value > 0 && value < 100000 ? Math.round(value) : undefined
}

/** Читает характеристики из формы. Незнакомые значения молча отбрасывает. */
export function parseAttributes(formData: FormData): ProductAttributes {
  const out: ProductAttributes = {}
  for (const key of Object.keys(CHOICE_GROUPS) as ChoiceKey[]) {
    const value = String(formData.get(`attr_${key}`) ?? '')
    if (CHOICE_GROUPS[key].options.some((o) => o.key === value)) out[key] = value
  }
  for (const key of NUMBER_FIELDS) {
    const value = num(formData.get(`attr_${key}`))
    if (value !== undefined) out[key] = value
  }
  for (const key of FLAG_FIELDS) {
    if (formData.get(`attr_${key}`) === 'on') out[key] = true
  }
  return out
}

export function label(group: ChoiceKey, key: string | undefined, lang: 'ru' | 'uz' = 'ru') {
  if (!key) return null
  const option = CHOICE_GROUPS[group].options.find((o) => o.key === key)
  return option ? option[lang] : null
}

/** Размеры одной строкой: 300 × 220 × 60 см */
export function sizeLine(a: ProductAttributes | null | undefined) {
  if (!a) return null
  const parts = [a.width_cm, a.height_cm, a.depth_cm]
  if (parts.every((p) => !p)) return null
  return parts.map((p) => (p ? String(p) : '—')).join(' × ') + ' см'
}

/**
 * Подписи характеристик для поискового индекса — на обоих языках.
 * Остальное (название, описание, категорию, тип, мастерскую) база
 * добавляет сама триггером, см. миграцию 0030. Клиент ищет «мдф лофт»
 * или «MDF» — найдётся и так и так.
 */
export function buildAttrText(attributes: ProductAttributes) {
  const words: string[] = []
  for (const key of Object.keys(CHOICE_GROUPS) as ChoiceKey[]) {
    const value = attributes[key]
    const option = value ? CHOICE_GROUPS[key].options.find((o) => o.key === value) : null
    if (option) words.push(option.ru, option.uz)
  }
  if (attributes.delivery) words.push('доставка', 'yetkazib berish')
  if (attributes.installation) words.push('установка сборка', "o'rnatish")
  return words.join(' ').toLowerCase()
}

/*
 * Слова, по которым не ищут: предлоги и союзы, а ещё «мебель» — на
 * площадке мебели это слово есть у всего подряд и ничего не отсекает.
 */
const STOP_WORDS = new Set([
  'на', 'в', 'во', 'из', 'для', 'и', 'с', 'со', 'по', 'под', 'до', 'от', 'к', 'ко', 'у', 'о', 'об', 'а', 'или', 'не',
  'мебель', 'мебели', 'мебелью', 'mebel', 'mebellar', 'uchun', 'va', 'bilan',
  'купить', 'заказать', 'ташкент', 'ташкенте', 'toshkent',
])

/*
 * Основа слова: срезаем окончание, чтобы «кухни», «кухню» и «кухня»
 * находили одно и то же. Грубо, но для коротких запросов работает:
 * «шкафы» → «шкаф», «спальни» → «спаль», «заказ» → «зака».
 */
function stem(word: string) {
  if (/^\d+$/.test(word)) return word
  if (word.length >= 7) return word.slice(0, -2)
  if (word.length >= 5) return word.slice(0, -1)
  return word
}

/** Слова запроса: без знаков, предлогов и окончаний. */
export function searchWords(q: string | undefined) {
  return [...new Set(
    (q ?? '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
      .map(stem),
  )].slice(0, 6)
}

/**
 * Насколько работа подходит к запросу. Слово в названии весит больше
 * всего, в категории — меньше, где-то в описании или характеристиках —
 * меньше всего. Работы, где нашлись все слова, всегда выше тех, где
 * нашлась только часть.
 */
export function relevance(
  words: string[],
  item: { title: string; category?: string | null; searchText?: string | null },
) {
  if (!words.length) return 0
  const title = item.title.toLowerCase().replace(/ё/g, 'е')
  const category = (item.category ?? '').toLowerCase()
  const text = (item.searchText ?? '').replace(/ё/g, 'е')
  let score = 0
  let found = 0
  for (const w of words) {
    const inTitle = title.includes(w)
    const inCategory = category.includes(w)
    const inText = text.includes(w)
    if (inTitle || inCategory || inText) found++
    if (inTitle) score += title.startsWith(w) ? 12 : 8
    if (inCategory) score += 5
    if (inText) score += 2
  }
  if (found === words.length) score += 100
  return score
}

/** Сортировки каталога */
export const SORTS = {
  new: { ru: 'Сначала новые', uz: 'Avval yangilari' },
  cheap: { ru: 'Сначала дешевле', uz: 'Avval arzonlari' },
  expensive: { ru: 'Сначала дороже', uz: 'Avval qimmatlari' },
  popular: { ru: 'Популярные', uz: 'Mashhurlari' },
} as const
export type SortKey = keyof typeof SORTS
