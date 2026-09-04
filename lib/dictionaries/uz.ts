import type { ru } from './ru'

/** Узбекский (латиница) — как пишут и читают в Ташкенте сегодня. */
export const uz: typeof ru = {
  code: 'uz',
  label: "O'zb",

  common: {
    search: 'Qidirish',
    back: 'Orqaga',
    priceOnRequest: "Narxi so'rov bo'yicha",
    currency: "so'm",
    from: 'dan',
    share: 'Ulashish',
    shareCopied: 'Havola nusxalandi',
    loading: 'Yuklanmoqda…',
  },

  nav: {
    catalog: 'Katalog',
    custom: 'Buyurtmaga',
    masters: 'Ustalar',
    home: 'Bosh sahifa',
    profile: 'Profil',
    admin: 'Boshqaruv',
    works: 'Ishlarim',
    signIn: 'Kirish',
    postFurniture: 'Mebel joylashtirish',
    add: "Qo'shish",
  },

  footer: {
    about:
      "Toshkent mebel ustalari va fabrikalari maydoni. Toping, solishtiring va vositachilarsiz to'g'ridan-to'g'ri qo'ng'iroq qiling.",
    buyers: 'Xaridorlarga',
    masters: 'Ustalarga',
    catalog: 'Mebel katalogi',
    allMasters: 'Barcha ustalar',
    account: 'Shaxsiy kabinet',
    terms: 'Shartlar',
    privacy: 'Maxfiylik',
    postFurniture: 'Mebel joylashtirish',
    sellerSignIn: 'Sotuvchilar uchun kirish',
    city: 'Toshkent',
  },

  home: {
    city: 'Toshkent',
    titleTop: 'Shahardagi barcha mebel',
    titleAccent: 'bitta joyda',
    lead: "Toshkent ustalari va fabrikalaridan tayyor va buyurtmaga mebel. Ishlar va narxlarni solishtiring va vositachilarsiz to'g'ridan-to'g'ri qo'ng'iroq qiling.",
    searchPlaceholder: 'Masalan: buyurtmaga oshxona',
    searchLabel: 'Mebel qidirish',
    promises: [
      ['Shahar ustalari', 'Fabrikalar va xususiy sexlar bitta katalogda'],
      ["To'g'ridan-to'g'ri qo'ng'iroq", "Vositachilarsiz va tanishtirish uchun ustamasiz"],
      ["O'z g'oyangiz", "O'z o'lchamlaringiz bo'yicha buyurtmaga mebel"],
    ],
    readyTitle: 'Tayyor mebel',
    readyText: "Hoziroq sotib olib ketish mumkin bo'lgani. Suratlar va narxlar katalogda.",
    readyLink: "Katalogni ko'rish →",
    customTitle: 'Buyurtmaga mebel',
    customText:
      "O'z g'oyangiz, o'z o'lchamlaringiz. Aynan sizga kerak narsani qiladigan ustani toping.",
    customLink: 'Usta topish →',
    freshTitle: 'Yangi ishlar',
    allCatalog: 'Butun katalog →',
    empty: "Katalog hozircha bo'sh — maydon endi ishga tushmoqda.",
    emptyAction: "Birinchi bo'lib mebelingizni joylashtiring",
    buyers: 'Xaridorlarga',
    buyTitle: 'Mebel sotib olish',
    buyText:
      "Kabinet oching — ustalarga yuborgan barcha arizalaringiz bir joyda bo'ladi. Kimga yozganingiz va kim javob berganini unutmaysiz.",
    buyAction: 'Xaridor kabinetini yaratish',
    buyNoteStart: 'Yoki shunchaki',
    buyNoteLink: "katalogni ko'ring",
    buyNoteEnd: "— ustaga ro'yxatdan o'tmasdan ham qo'ng'iroq qilish mumkin.",
    masters: 'Ustalarga',
    sellTitle: 'Mebel yasaysizmi? Sizni shu yerda topishadi',
    sellText:
      "Ishlaringiz va telefoningizni joylashtiring — aynan sizning mebelingizni qidirayotgan mijozlardan qo'ng'iroq oling. Ro'yxatdan o'tish bepul.",
    sellAction: 'Mebel joylashtirish',
  },

  banner: {
    buyerTitle: 'Mebel sotib olmoqchimisiz?',
    buyerText:
      "Turkumlar bo'yicha tanlang, ishlar va narxlarni solishtiring va ustaga to'g'ridan-to'g'ri qo'ng'iroq qiling. Kabinet oching — barcha arizalaringiz bir joyda bo'ladi.",
    buyerAction: "Kirish yoki ro'yxatdan o'tish",
    buyerNote: "Ro'yxatdan o'tish bepul, bir daqiqa vaqt oladi",
    sellerTitle: 'Buyurtmaga mebel yasaysizmi?',
    sellerText:
      "Ustaxonangizni joylashtiring — nomi, telefoni, ish suratlari va narxlari. Toshkent mijozlari sizni katalogdan topib, vositachilarsiz qo'ng'iroq qiladi.",
    sellerAction: "Maydonda usta bo'ling",
    sellerNote: "Bepul, buyurtmalardan komissiyasiz",
  },

  catalog: {
    title: 'Mebel katalogi',
    searchPlaceholder: 'Katalog bo‘yicha qidirish',
    category: 'Turkum',
    type: 'Turi',
    district: 'Tuman',
    found: 'Topildi',
    empty: "Bu so'rov bo'yicha hozircha hech narsa yo'q.",
    reset: 'Filtrlarni tozalash',
  },

  companies: {
    title: 'Toshkent ustalari',
    lead: "Shahar fabrikalari, sexlari va xususiy ustalari. Ish turi va tuman bo'yicha tanlang va to'g'ridan-to'g'ri qo'ng'iroq qiling.",
    filterWork: 'Nima qilishadi',
    empty: 'Ustalar hozircha yo‘q — maydon endi ishga tushmoqda.',
    emptyAction: "Maydondagi birinchi usta bo'ling",
    works: 'ish',
    district: 'tumani',
  },

  company: {
    phoneVerified: 'Telefon tasdiqlangan',
    address: 'Manzil',
    works: 'Ishlar',
    canOrder: 'Nimalar buyurtma qilish mumkin',
    noWorks: "Usta hali ish qo'shmagan.",
    backToCatalog: '← Katalogga qaytish',
    call: "Qo'ng'iroq qilish",
  },

  product: {
    customNote:
      "Buyurtmaga mebel — yakuniy narx o'lcham va materialga bog'liq. Ustaga qo'ng'iroq qilib, nima kerakligini ayting.",
    master: 'Usta',
    call: "Qo'ng'iroq qilish",
    description: 'Tavsif',
    similar: 'Ustaning boshqa ishlari',
    disclaimer:
      "Mebel — bu ustalar vitrinasi. Shartnoma, to'lov, muddat va sifat — siz bilan usta o'rtasida; maydon bitimda qatnashmaydi.",
    terms: 'Shartlar',
  },

  gallery: {
    open: 'Suratni ochish',
    of: 'dan',
    close: 'Yopish',
    openWork: 'Ishni ochish',
    prev: 'Oldingi surat',
    next: 'Keyingi surat',
  },

  request: {
    button: 'Ariza yozish',
    title: 'Ustaga ariza',
    close: 'Yopish',
    name: 'Ismingiz',
    phone: 'Telefon',
    comment: 'Nima kerak',
    commentPlaceholder: "Masalan: 3 metrli oshxona, MDF fasadlar, o'lchov kerak",
    submit: 'Arizani yuborish',
    sending: 'Yuborilmoqda…',
    note: "Ariza to'g'ridan-to'g'ri ustaga boradi. Kelishuv va to'lov siz bilan usta o'rtasida — maydon bitimda qatnashmaydi.",
  },

  auth: {
    brand: 'Mebel · Toshkent',
    sellerTitle: 'Usta kabineti',
    sellerSubtitle: 'Ishlar, arizalar va mijozlar — bir joyda',
    buyerTitle: 'Shaxsiy kabinet',
    buyerSubtitle: 'Ustalarga arizalar va murojaatlar tarixi — bir joyda',
    signIn: 'Kirish',
    signUp: "Ro'yxatdan o'tish",
    email: 'Pochta',
    password: 'Parol',
    name: 'Ismingiz',
    phone: 'Telefon',
    phoneHintSeller: "Shu raqam orqali mijozlar siz bilan bog'lanadi",
    phoneHintBuyer: "Shu raqam orqali usta siz bilan bog'lanadi",
    doSignIn: 'Kirish',
    signingIn: 'Kirilmoqda…',
    createAccount: 'Kabinet yaratish',
    creating: 'Yaratilmoqda…',
    codeLogin: 'Kod orqali kirish',
    forgot: 'Parolni unutdingizmi?',
    freeSeller: "Ro'yxatdan o'tish bepul. Keyin ustaxona profilini to'ldirasiz.",
    freeBuyer: "Ro'yxatdan o'tish bepul. Ustalarga barcha arizalar — bir joyda.",
    orSeller: 'Mebel yasaysizmi?',
    orSellerLink: 'Usta kabineti',
    orBuyer: 'Mebel qidiryapsizmi?',
    orBuyerLink: 'Xaridor kabineti',
    linkExpired: "Xatdagi havola eskirgan yoki ishlatilgan. Yangisini so'rang.",
    or: 'yoki',
    google: 'Google bilan davom etish',
    googleOpening: 'Ochilmoqda…',
    googleOff: 'Google orqali kirish hali ulanmagan',
    googleFailed: 'Kirish oynasini ochib bo‘lmadi. Yana urinib ko‘ring',
  },

  welcome: {
    brand: 'Mebel · Toshkent',
    title: 'Keling, tanishamiz',
    subtitle: "Ikkita maydon qoldi — va kabinet sizniki",
    name: 'Ismingiz nima',
    nameHint: "Bu ismni maydonda muloqot qiladigan odamlar ko'radi",
    phone: 'Telefon',
    phoneHintSeller: "Shu raqam orqali mijozlar siz bilan bog'lanadi",
    phoneHintBuyer: "Shu raqam orqali usta siz bilan bog'lanadi",
    role: 'Nima uchun keldingiz',
    roleBuyer: 'Mebel qidiryapman',
    roleSeller: 'Mebel yasayman',
    submit: 'Davom etish',
    saving: 'Saqlanmoqda…',
    note: "Ism va telefonni kabinetda istalgan vaqtda o'zgartirish mumkin.",
  },

  terms: {
    title: 'Shartlar',
    lead: "Qisqa va yuridik tumansiz: maydonda kim nimaga javob beradi.",
    sections: [
      {
        title: 'Mebel nima',
        body: [
          "Mebel — Toshkent mebel ustalari va fabrikalarining vitrinasi. Maydon xaridorga usta topishga, ustaga esa mijoz olishga yordam beradi.",
          "Maydon mebel sotmaydi, uni yasamaydi, buyurtma uchun to'lov qabul qilmaydi va xaridor bilan usta o'rtasidagi bitimda qatnashmaydi.",
        ],
      },
      {
        title: 'Usta nimaga javob beradi',
        body: [
          "Usta o'z ishlari, narxlari va kontaktlarini o'zi joylashtiradi va bu ma'lumotlarning to'g'riligiga javob beradi.",
          "Xaridor bilan shartnoma, muddat, narx, material, o'lchov, yetkazib berish, montaj, kafolat va tayyor mebel sifati — butunlay ustaning javobgarligi.",
          "Buyurtma bo'yicha barcha nizolar xaridor bilan usta o'rtasida to'g'ridan-to'g'ri hal qilinadi.",
        ],
      },
      {
        title: 'Xaridor nimaga javob beradi',
        body: [
          "Xaridor ustani o'zi tanlaydi va u bilan shartlarni kelishadi: narx, muddat, oldindan to'lov va ishni qabul qilish tartibi.",
          "To'lovdan oldin kelishuvlarni yozma qayd etgan ma'qul — yozishmada yoki usta bilan shartnomada.",
        ],
      },
      {
        title: 'Maydon nimaga javob bermaydi',
        body: [
          "Maydon bitim tarafi emas va mebel sifati, tayyorlash muddati, qaytarish, oldindan to'lov hamda xaridor bilan usta munosabatidan kelib chiqqan zararlar uchun javob bermaydi.",
          "Maydon ustalar ishining sifatini tekshirmaydi va natijani kafolatlamaydi. Ro'yxatdan o'tishdagi tekshiruv faqat ustaxona mavjudligini va ishlaydigan kontakt ko'rsatilganini tasdiqlaydi.",
        ],
      },
      {
        title: 'Maydon nima qiladi',
        body: [
          "Biz yangi ustaxonalarni e'lon qilishdan oldin tekshiramiz va asosli shikoyat tushganlarni katalogdan olib tashlaymiz.",
          "Agar usta aldagan bo'lsa — bizga yozing. Pulni qaytara olmaymiz, lekin ustaxonani bloklaymiz, boshqalar shu yo'lda tushmasin.",
        ],
      },
      {
        title: 'Pullik xizmatlar',
        body: [
          "Usta obuna va reklamaga pul to'lashi mumkin — bu faqat katalogdagi o'ringa va kabinet imkoniyatlariga ta'sir qiladi.",
          "Pullik reklama maydon tomonidan tavsiya emas va ish sifati haqida gapirmaydi.",
        ],
      },
    ],
    footerStart: "Maydondan foydalanish orqali siz ushbu shartlarga rozilik bildirasiz. Ustalar haqidagi savol va shikoyatlar —",
    footerLink: 'ustaxona sahifasi',
    footerEnd: 'orqali yoki bevosita maydon administratoriga.',
  },

  privacy: {
    title: 'Maxfiylik',
    lead: "Qanday ma'lumot yig'amiz, u nima uchun kerak va kim ko'radi. Yuridik tumansiz.",
    sections: [
      {
        title: "Qanday ma'lumot yig'amiz",
        body: [
          "Pochta orqali ro'yxatdan o'tganda: ism, telefon, elektron pochta va parol. Parol shifrlangan holda saqlanadi — uni hatto biz ham ko'rmaymiz.",
          "Google orqali kirganda: elektron pochta va Google akkauntidagi ism. Google paroli bizga tushmaydi. Ismni tasdiqlashingizni yoki o'zingiznikiga almashtirishingizni so'raymiz — uni maydondagi boshqa odamlar ko'radi.",
          "Ustada qo'shimcha: ustaxona nomi, tuman, ish turi, mijozlar uchun telefon, tavsif, ijtimoiy tarmoq havolalari, ish suratlari va narxlar. Bularning barchasini usta o'zi joylashtiradi va nimani ko'rsatishni o'zi hal qiladi.",
          "Usta kabinetida uning mijozlari va arizalari saqlanadi: ism, telefon va buyurtma mazmuni. Bu ma'lumotni usta o'zi kiritadi, ular unga ish uchun kerak.",
          "Shaxssiz tashrif statistikasi: usta yoki mahsulot sahifasi necha marta ochilgani. Ismlarsiz va aniq odamga bog'lamasdan.",
        ],
      },
      {
        title: "Bu ma'lumot nima uchun kerak",
        body: [
          "Telefon — usta ariza bo'yicha qo'ng'iroq qilishi va xaridor ustaga yetib borishi uchun. Usiz maydonning ma'nosi yo'q.",
          'Pochta — kabinetga kirish va parolni tiklash uchun.',
          "Ism — odamlar kim bilan gaplashayotganini bilishi uchun.",
          "Statistika — usta ishlarini necha kishi ko'rganini bilsin, biz esa qaysi bo'limlar kerakligini tushunaylik.",
        ],
      },
      {
        title: "Ma'lumotingizni kim ko'radi",
        body: [
          "Ustaning telefoni va ismi barcha tashrifchilarga ko'rinadi — katalogning ma'nosi shunda, usta ularni mijozlar uchun joylashtiradi.",
          "Xaridorning telefoni va ismini faqat ariza yuborilgan usta ko'radi. Boshqa ustalar va tashrifchilarga ular ko'rsatilmaydi.",
          "Ustaning mijozlar bazasi — faqat uniki. Maydon administratori faqat mijozlar va arizalar sonini ko'radi, ismlar va telefonlarni emas.",
          "Biz ma'lumotni sotmaymiz, reklama beruvchilarga bermaymiz va uchinchi shaxslar reklamasini yubormaymiz.",
        ],
      },
      {
        title: "Ma'lumot qayerda saqlanadi",
        body: [
          "Ma'lumot Supabase (PostgreSQL) bazasida yotadi, unga kirish baza darajasidagi qoidalar bilan cheklangan: har kim faqat o'zinikini ko'radi.",
          'Sayt Cloudflare Workers ustida ishlaydi. Ulanish shifrlash bilan himoyalangan.',
          "Ish suratlari himoyalangan omborda saqlanadi va to'g'ridan-to'g'ri havola orqali ochiladi — ular katalogda ham ko'rinadi.",
        ],
      },
      {
        title: 'Kuki va kirish',
        body: [
          "Biz faqat kirish uchun zarur texnik kukilardan foydalanamiz: ular seansingizni saqlaydi, shunda har sahifada qayta kirish shart emas. Yana bitta kuki tanlangan tilni eslab qoladi.",
          "Maydonda reklama va kuzatuv kukilari yo'q.",
        ],
      },
      {
        title: "Ma'lumotni qanday o'chirish",
        body: [
          "Maydon administratoriga yozing — akkaunt ustaxona, mahsulotlar, arizalar va mijozlar bilan birga o'chiriladi.",
          "O'chirish qaytarilmas: undan keyin ma'lumotni tiklab bo'lmaydi.",
          "Ism va telefonni kabinetda istalgan vaqtda o'zingiz o'zgartirasiz, bizga murojaat qilmasdan.",
        ],
      },
      {
        title: "O'zgarishlar",
        body: [
          "Agar ma'lumotlarni qayta ishlash qoidalarini o'zgartirsak, yangilangan versiya shu sahifada paydo bo'ladi.",
        ],
      },
    ],
    footerStart: 'Mebel buyurtma qilganda kim nimaga javob berishi —',
    footerLink: 'foydalanish shartlarida',
    footerEnd: '.',
  },

  install: {
    title: 'Telefoningizga o‘rnating',
    text: "Bosh ekranda belgi paydo bo'ladi va oddiy ilova kabi ochiladi — App Store'siz va telefon xotirasini egallamasdan.",
    button: "O'rnatish",
    iosButton: "Qanday o'rnatiladi",
    later: 'Keyinroq',
    close: 'Yopish',
    installed: "Tayyor — belgi bosh ekranda",
    iosTitle: "iPhone'ga o'rnatish",
    iosSteps: [
      "Ekran pastidagi «Ulashish» belgisini bosing — yuqoriga strelkali kvadrat.",
      "Ro'yxatni aylantirib «Bosh ekranga» («Add to Home Screen») ni tanlang.",
      "«Qo'shish» ni bosing — Mebel belgisi boshqa ilovalar yonida paydo bo'ladi.",
    ],
    iosNote: "Safari'da ishlaydi. Havolani Telegram yoki Instagram'da ochgan bo'lsangiz, «Safari'da ochish» ni bosing, aks holda o'rnatish tugmasi chiqmaydi.",
  },

  districts: {
    Алмазарский: 'Olmazor',
    Бектемирский: 'Bektemir',
    Мирабадский: 'Mirobod',
    'Мирзо-Улугбекский': "Mirzo Ulug'bek",
    Сергелийский: 'Sergeli',
    Учтепинский: "Uchtepa",
    Чиланзарский: 'Chilonzor',
    Шайхантахурский: 'Shayxontohur',
    Юнусабадский: 'Yunusobod',
    Яккасарайский: 'Yakkasaroy',
    Янгихаётский: "Yangihayot",
    Яшнабадский: 'Yashnobod',
  },

  workTypes: {
    ready_made: 'Tayyor mebel',
    custom: 'Buyurtmaga mebel',
    both: 'Tayyor va buyurtmaga',
  },

  productTypes: {
    ready_made: 'Tayyor',
    custom_order: 'Buyurtmaga',
  },

  categories: {
    kitchens: 'Oshxonalar',
    'bedroom-living': 'Yotoqxona va mehmonxona',
    office: 'Ofis mebeli',
    kids: 'Bolalar mebeli',
  },
}
