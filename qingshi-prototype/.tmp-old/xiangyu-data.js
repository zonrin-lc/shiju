/* 《青史生存录》项羽剧本《霸王之局》剧本数据
 * 与 GDD 附录 G 一一对应。纯数据文件，浏览器与 Node 通用（多剧本架构）。
 * 词条标记：叙事文本中 ⟦词条⟧ 会渲染为可点按的百科入口（见 GLOSSARY）。
 * 属性键：quanshi 权势 / shengwang 声望 / junxin 君心 / caifu 财富 / caixue 才学 / weiji 危机
 * 隐藏值 zg：诸侯离心（HIDDEN.init=15）。定位：硬核（容错 0–1，GDD 平衡准则 4）
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.XIANGYU_DATA = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  var ATTRS = [
    { k: 'quanshi', n: '权势', words: [[80, '威震天下'], [50, '霸有诸侯'], [25, '号为上将'], [0, '匹夫之勇']] },
    { k: 'shengwang', n: '声望', words: [[80, '天下归心'], [50, '威德并著'], [25, '勇名远播'], [0, '默默无闻']] },
    { k: 'junxin', n: '君心', words: [[70, '众望所归'], [45, '诸侯宾服'], [20, '面合心离'], [0, '人人自危']] },
    { k: 'caifu', n: '财富', words: [[70, '府库山积'], [40, '仓廪充实'], [15, '尚可支军'], [0, '囊空如洗']] },
    { k: 'caixue', n: '才学', words: [[75, '万人之敌'], [55, '知兵善战'], [35, '粗通兵法'], [0, '勇而无谋']] },
    { k: 'weiji', n: '危机', words: [[90, '命悬一线'], [70, '四面楚歌'], [40, '叛者渐起'], [0, '岁月静好']], inverse: true }
  ];

  var ATTR_NAMES = { quanshi: '权势', shengwang: '声望', junxin: '君心', caifu: '财富', caixue: '才学', weiji: '危机' };

  var INIT = { quanshi: 10, shengwang: 20, junxin: 16, caifu: 15, caixue: 40, weiji: 12 };

  var DIFFICULTY = {
    story:    { n: '剧情', wj: 0.6, corr: 0.5, coef: 0.8,  backtrack: -1, lethal: false, hideAttrs: false,
                desc: '数值全可见，无限回溯，危机增长放缓，不会致死' },
    normal:   { n: '普通', wj: 1.0, corr: 1.0, coef: 1.0,  backtrack: 1,  lethal: true,  hideAttrs: false,
                desc: '标准体验，每章可回溯一次' },
    hardcore: { n: '硬核', wj: 1.2, corr: 1.3, coef: 1.25, backtrack: 0,  lethal: true,  hideAttrs: true,
                desc: '危机×1.2，无回溯，属性仅以状态词显示' }
  };

  var DEV_BANDS = [
    { max: 20, name: '循史', color: '#7fa8a0' },
    { max: 45, name: '微澜', color: '#c9a959' },
    { max: 70, name: '改流', color: '#c97a3a' },
    { max: 100, name: '逆天', color: '#b0432f' }
  ];

  /* ============ 结局库 ============ */
  var ENDINGS = {
    E1: {
      name: '乌江自刎', seal: '循史', cuncun: 25, nitian: false, devMax: 45, ach: ['wujiang'],
      zhuan: '太史公曰：羽之力，拔山；羽之气，盖世。巨鹿九战，秦以不振；彭城一击，汉几不国。然坑降卒二十万，失天下之心；弑义帝于江中，失楚人之心；鸿门一纵，失范增之心；垓下一败，并己之心亦失之。乌江亭长檥船待，羽笑曰：纵江东父兄怜而王我，我何面目见之！遂自刎，年三十一。自矜功伐，奋其私智而不师古，谓“天亡我，非战之罪”——至死不悟，此其所以为羽也，亦其所以为楚也。'
    },
    E2: {
      name: '会稽老卒', seal: '苟活', cuncun: 100, nitian: false,
      zhuan: '太史公曰：吴中有项氏子，力能扛鼎，勇闻乡里。及大泽兵起，或劝之举，不应，曰：吾弓马足自给耳。后十年，闻楚汉争，笑曰：幸不我去。卒以寿终，子孙为里中豪。'
    },
    E3: {
      name: '执戟余生', seal: '苟活', cuncun: 75, nitian: false,
      zhuan: '太史公曰：羽起于卒伍，终不预兵机。巨鹿之后，楚虽强，非其楚也。羽执戟于诸侯之师，先登则赏，败阵则罚，十数年解甲归乡。乡人问巨鹿事，曰：阵上风大，看不见。'
    },
    E4: {
      name: '鸿沟真和', seal: '稳健', cuncun: 85, nitian: false, devMin: 21,
      zhuan: '太史公曰：鸿门纵刘，羽不失天下之望；长沙不弑，楚不失黎民之戴；范增不去，楚不失帷幄之谋。及鸿沟中分，羽守约不渝，汉亦终不能逾。东西各帝，十年而羽薨于彭城，谥曰霸王。向使羽能师古，不奋私智——其业，岂止五年哉！'
    },
    E5: {
      name: '霸王之业', seal: '稳健', cuncun: 90, nitian: false, devMin: 21,
      zhuan: '太史公曰：羽不坑一卒，不弑一帝，礼范增以终始。诸侯虽叛，叛而不炽；汉王虽强，强而不东。成皋一役，羽驱汉于巩洛，与之约和而王。太史公所谓“欲以力征经营天下”者，羽为之矣；而不以力征失天下者，羽亦悟之矣。'
    },
    E6: {
      name: '江东再砺', seal: '逆天', cuncun: 80, nitian: true, devMin: 46,
      zhuan: '太史公曰：乌江之渡，羽受亭长之檥。渡江之日，驻马北望，曰：吾必复来。江东父老闻王归，襁负而至者十万。羽乃折节下士，用故楚之才，约法于乡，休兵于野。三年，楚师再振；五年，临淮而观汉。江东子弟多才俊，卷土重来——杜牧之诗，不为虚语矣。'
    },
    E7: {
      name: '垓下无楚', seal: '逆天', cuncun: 75, nitian: true, devMin: 46,
      zhuan: '太史公曰：鸿门一匕，沛公殒于霸上。汉不兴，楚独强。然诸侯之叛，不系一人之存亡：田荣反齐，彭越挠梁，英布畔淮南。羽南征北讨，五年不释甲，终以力定之，都彭城而号霸王。史称：羽以力取天下，亦以力守天下——取者五年，守者亦不过十年耳。'
    },
    E8: {
      name: '霸王之殁', seal: '败局', cuncun: 10, nitian: false,
      zhuan: '太史公曰：羽之勇，冠绝古今；羽之败，亦快于古今。或溃于固陵，或陷于阴陵之泽，或亡于彭城之变，或死于安阳之帐。恃力者，力尽则蹶——项氏之兴也暴，其亡也忽。',
      variants: {
        anyang: { name: '安阳之诛',
          zhuan: '太史公曰：安阳之谋，羽欲斩宋义，为义所觉，先事诛羽。或曰：羽若不死，楚兵不破；宋义若进，赵围不解。然羽死而义终不进，秦亦不复振——一人之去留，天下之枢机，夫岂偶然？' },
        guling: { name: '固陵之溃',
          zhuan: '太史公曰：固陵之野，楚师一溃不再振。羽单骑突围，身被十创，殁于乱军。拔山之力，至此山穷；盖世之气，至此水尽。' },
        yinling: { name: '阴陵之泽',
          zhuan: '太史公曰：羽迷道阴陵，田父绐之“左”，乃陷大泽中，骑不能出，步不能脱，汉骑四合。拔山者，终困于尺寸之地——天之亡楚，以地杀之。' }
      }
    }
  };

  /* ============ 章节与事件 ============
   * 关键 Flag：wanrendi 万人敌之志 / zidii 八千子弟 / fanzeng 范增在侧 / pofu 破釜沉舟 /
   *   kengzu 坑降卒之污 / shiyidi 弑义帝之污 / zongliu 鸿门纵刘 / conghan? 不需要
   *   jiangdong 江东根基 / yu 虞兮
   * 硬核定位（容错 0–1）：战役失败大多直入 E8，仅巨鹿留一条苦战线。
   */
  var CHAPTERS = [
    /* ---------- 序章 ---------- */
    {
      id: 'c0', title: '序章 ｜ 吴中少年', sub: '教学章 · 约前 220—前 210',
      summaryNotes: [
        '【教学】上方六维是你的命数。危机涨满之日，便是垓下歌起之时。',
        '【教学】偏离度记你与史实的距离，只增不减：≤20 循史，21–45 微澜，46–70 改流，71 以上逆天。',
        '【教学】选项旁带"史"字者，是史书所载项羽的本来面目。循之则稳，违之则波澜自生。'
      ],
      intro: [
        '你是⟦下相⟧人，姓项名籍，字羽。叔父⟦项梁⟧教你读书，不成；教你学剑，又不成。',
        '你说：书足以记名姓而已；剑一人敌，不足学——学万人敌。',
        '这一年你二十二岁。史书上还没有你的名字。'
      ],
      start: '0-1',
      events: [
        { id: '0-1', title: '学万人敌',
          segs: ['项梁听你这句"万人敌"，不怒反喜，开始教你兵法。', '你白天演武，夜里读阵，吴中的少年子弟，渐渐都不敢直视你的眼睛。'],
          options: [
            { t: '昼夜研习，志在必得', hist: true, res: '兵法的骨架在你心里立了起来。吴中子弟，已皆惮你。', eff: { attrs: { caixue: 5, shengwang: 3 }, dev: 0, flags: ['wanrendi'], ach: 'wanrendi' }, to: '0-2' },
            { t: '以力代学，勇闻乡里', res: '你懒得读那些竹简。鼎你举得起来，名声也传了出去——以另一种方式。', eff: { attrs: { shengwang: 5, caixue: -2 }, dev: 3 }, to: '0-2' },
            { t: '观始皇渡浙江', res: '秦始皇东游渡浙江，万人空巷。你在人堆里脱口而出：“彼可取而代也！”项梁一把捂住你的嘴。', eff: { attrs: { shengwang: 5, weiji: 5 }, dev: 5, flags: ['wanrendi'] }, to: '0-2' }
          ] },
        { id: '0-2', title: '吴中结客',
          segs: ['吴中的豪杰、县里的掾吏，遇到大事都来寻项梁。你开始替叔父主办征发与酒席。', '哪些人能战，哪些人能用，哪些人是祸根——你心里有一本册子。'],
          options: [
            { t: '悉心结交，网罗俊杰', res: '桓楚、龙且、季布、钟离眜——这些名字，日后都是你的臂膀。', eff: { attrs: { shengwang: 4, caifu: -3 }, dev: 0, flags: ['jieke'] }, to: '0-3' },
            { t: '独来独往，不事交游', res: '你懒得应付这些人。拳头够硬，要朋友做什么。', eff: { attrs: { weiji: -3, shengwang: -2 }, dev: 3 }, to: '0-3' },
            { t: '比武立威，压服一方', res: '校场上你连挫七人。吴中再没人敢在你面前大声说话。', eff: { attrs: { shengwang: 5, weiji: 5 }, dev: 3 }, to: '0-3' }
          ] },
        { id: '0-3', title: '大泽风雷',
          segs: ['前209年七月，陈胜吴广起于大泽。天下云集响应，会稽郡守殷通也动了心思。', '殷通请项梁议事，席间说了一句：“江西皆反，此亦天亡秦之时也。”'],
          options: [
            { t: '随叔父赴府，静观其变', hist: true, res: '你按剑随项梁入府。会稽的天，今夜要变了。', eff: { attrs: { caixue: 2 }, dev: 0 }, to: 'NEXT' },
            { t: '不预兵事，守家自全', res: '很多年后，楚汉的烽火烧遍中原，吴中的项宅里只有练武的呼喝声。', eff: { dev: 0 }, to: { ending: 'E2' } }
          ] }
      ]
    },
    /* ---------- 第一章 ---------- */
    {
      id: 'c1', title: '第一章 ｜ 会稽起兵', sub: '前 209—前 208',
      summaryNotes: [
        '一颗头颅，八百人，八千子弟——项氏的楚旗，就这样竖了起来。',
        '范增来了。七十岁的老人，眼里装着整个天下。用不用他，是你一生的题。'
      ],
      intro: ['郡守府里，殷通还做着"我为将、项梁为副"的梦。', '项梁看你一眼。你懂这个眼神：先下手为强。'],
      start: '1-1',
      events: [
        { id: '1-1', title: '会稽夺印',
          segs: ['你拔剑而起，殷通的人头滚落在丹墀之下。', '府中大乱，甲士环起。你持守的头颅，佩其印绶，立于庭中——', '须臾之间，你击杀了数十百人，一府皆慑，莫敢起。'],
          options: [
            { t: '召故吏豪杰，收兵八千人', hist: true, res: '你收编郡兵，得精兵八千。吴中子弟，争为死士——这八千人，是你全部的本钱。', eff: { attrs: { quanshi: 10, shengwang: 5 }, dev: 0, flags: ['zidii'], merit: '起兵', ach: 'zidii' }, to: '1-2' },
            { t: '纵兵大掠，以威立名', res: '会稽三日不宁。兵是收得更多了，人心却散了半截。', eff: { attrs: { caifu: 8, shengwang: -5, weiji: 5 }, dev: 5 }, to: '1-2' }
          ] },
        { id: '1-2', title: '范增来投',
          segs: ['居巢人⟦范增⟧，年七十，素居家，好奇计，闻项氏起，拄杖而来。', '他看了你很久，只说了一句：“羽非百里才也。”'],
          options: [
            { t: '礼为上宾，尊称亚父', hist: true, res: '你以亚父之礼事之。老者的眼里，第一次有了温度。', eff: { attrs: { junxin: 5, caixue: 3 }, dev: 0, flags: ['fanzeng'], ach: 'yafu' }, to: '1-3' },
            { t: '以客卿待之，不亲不疏', res: '范增留下了，话却只说三分。老谋士的分寸，你还不懂。', eff: { attrs: { weiji: -2 }, dev: 3, flags: ['fanzeng'] }, to: '1-3' },
            { t: '以武夫轻之', res: '“七十老叟，何奇计之有？”范增笑了笑，转身出帐。此后他再没主动献过一策。', eff: { attrs: { caixue: -3, junxin: -3 }, dev: 5 }, to: '1-3' }
          ] },
        { id: '1-3', title: '立楚怀王',
          segs: ['项梁渡江而西，众至数万。范增进言：秦灭六国，楚最无罪——宜立楚后。', '你找到了楚怀王的孙子熊心，正在民间牧羊。'],
          options: [
            { t: '立熊心为楚怀王，以从民望', hist: true, res: '牧羊儿登基，楚地的父老山呼万岁。这面旗，把散沙聚成了军。', eff: { attrs: { junxin: 8, shengwang: 5 }, dev: 0 }, to: 'NEXT' },
            { t: '不立虚名，自号为长', res: '“楚人之后，何必牧羊儿！”项梁沉吟良久，依了你。省去一尊神像，也少了一面大旗。', eff: { attrs: { quanshi: 5, junxin: -8, shengwang: -5 }, dev: 8 }, to: 'NEXT' }
          ] }
      ]
    },
    /* ---------- 第二章 节点N1 ---------- */
    {
      id: 'c2', title: '第二章 ｜ 安阳与巨鹿', sub: '前 208—前 207 · 历史节点',
      summaryNotes: [
        '宋义的头落地时，没人敢说话。上将军的印绶，是自己挣来的，不是怀王给的。',
        '漳水很凉。破釜沉舟的那把火，会烧进中国两千年的兵书里。'
      ],
      intro: ['定陶之败，项梁死。楚怀王夺了项氏的兵权，以⟦宋义⟧为上将军、你为次将、范增为末将，北上救赵。', '大军行至安阳，宋义一停，就是四十六天。'],
      node: 'N1',
      mutations: [
        { if: { shengwang: 50 }, flag: 'zhufu', note: '【节点异变】你的勇名已压过宋义——诸将早就在等一个由头。' },
        { if: { junxinMax: 20 }, flag: 'huaiyi', note: '【节点异变】怀王与宋义，已经在商量怎么除掉项氏——先动手的理由，他们递给你了。' },
        { if: { weiji: 60 }, flag: 'liangjue', note: '【节点异变】军粮见底。宋义还在饮酒高会——你没有下一个四十六天了。' },
        { if: { devMin: 40 }, flag: 'songyiqiang', note: '【节点异变】历史偏了：宋义先动手了——今夜帐外埋伏的，是他的人。' }
      ],
      start: '2-1',
      events: [
        { id: '2-1', title: '安阳夺军', key: true,
          altSegs: { flag: 'songyiqiang', segs: ['你入帐时，宋义没有抬头。两侧的刀斧手先动了——他算到了你会算他。', '剑光比伏刀快了一线。帐外的亲兵听见响声冲进来时，宋义已经倒在了血泊里。'] },
          segs: ['你晨朝上将军宋义，即其帐中。', '“国家安危，在此一举；今不恤士卒而徇其私，非社稷之臣！”剑出鞘，头落地。', '你提宋义头出帐，号令军中：宋义与齐谋反楚，楚王阴令羽诛之。诸将慴服，共立你为假上将军。'],
          options: [
            { t: '斩宋义，夺上将军印', hist: true, res: '怀王得到消息，沉默了三日，最终遣使授你真上将军。从这一天起，楚军姓项。', eff: { attrs: { quanshi: 10, shengwang: 5, weiji: 5 }, dev: 0, merit: '巨鹿', ach: 'duojun' },
              to: [ { if: { anyflag: ['zhufu', 'huaiyi', 'songyiqiang', 'liangjue'] }, to: '2-2' }, { if: { quanshi: 20 }, to: '2-2' }, { to: { ending: 'E8', variant: 'anyang' } } ] },
            { t: '再谏一次，引兵绕开宋义', res: '你留下宋义，自带八千子弟先行北上。身后的大军，是追上来还是散掉，由不得你了。', eff: { attrs: { quanshi: -5, weiji: 8, shengwang: 3 }, dev: 8 }, to: '2-2' },
            { t: '忍而不发', res: '你又忍了十天。第十一天，宋义请你"议事"——鸿门原来处处有。', eff: { attrs: { junxin: -5, weiji: 10 }, dev: 5 }, to: { ending: 'E8', variant: 'anyang' } }
          ] },
        { id: '2-2', title: '破釜沉舟',
          segs: ['你引兵渡漳水。河对岸，章邯四十万秦军围巨鹿如铁桶。', '你下令：皆沈船，破釜甑，烧庐舍，持三日粮——', '“以示士卒必死，无一还心。”'],
          options: [
            { t: '沉船破釜，决一死战', hist: true, res: '八千楚军过河时没有一个人回头。营垒烧掉的烟，三十里外都看得见。', eff: { attrs: { weiji: 10, shengwang: 8, caixue: 3 }, dev: 0, flags: ['pofu'], ach: 'pofu' }, to: '2-3' },
            { t: '留船半渡，进退有据', res: '你留了一半船。士卒们看了你一眼，眼神里的东西淡了些。', eff: { attrs: { weiji: -5, shengwang: -5, caixue: -3 }, dev: 5 }, to: '2-3' }
          ] },
        { id: '2-3', title: '巨鹿之战',
          segs: ['九战。你与秦军九战，楚卒呼声动天地，无不以一当十。', '章邯的甬道断了，王离被擒，涉间自焚。巨鹿之围，一朝而解。', '诸侯将入辕门，无不膝行而前，莫敢仰视。'],
          options: [
            { t: '九战破秦，诸侯上将军', hist: true, res: '从辕门出来，你就是天下的上将军了——不是靠印绶，是靠秦军四十万的溃败堆出来的。', eff: { attrs: { quanshi: 12, shengwang: 12, junxin: 8 }, dev: 0, merit: '巨鹿', ach: 'julu' },
              to: [ { if: { flag: 'pofu', caixue: 45 }, to: 'NEXT' }, { if: { quanshi: 45 }, to: 'NEXT' }, { to: { ending: 'E8', variant: 'guling' } } ] },
            { t: '与诸侯合兵同进', res: '你把首功分给了诸侯。破秦的声势小了些，盟主的座位稳了些。', eff: { attrs: { quanshi: 6, junxin: 8, shengwang: 5 }, dev: 5 }, to: 'NEXT' }
          ] }
      ]
    },
    /* ---------- 第三章 ---------- */
    {
      id: 'c3', title: '第三章 ｜ 鸿门', sub: '前 207—前 206 · 历史节点',
      summaryNotes: [
        '二十万降卒的命，是新安城外一夜就埋掉的——往后很多年，你才明白这一夜埋的是什么。',
        '鸿门那一夜，范增举了三次玉玦。你三次都没有看他。'
      ],
      intro: ['章邯率二十万秦卒来降。受降的仪式很风光，你的眉头却一天比一天紧。', '降卒里全是关中子弟——进关的路还长，二十万张吃饭的嘴，二十万颗不定的心。'],
      node: 'N2',
      mutations: [
        { if: { caifu: 30 }, flag: 'liangzu', note: '【节点异变】军粮尚足——你还有一个"不必杀"的选择摆在案上。' },
        { if: { devMin: 40 }, flag: 'jiangbian', note: '【节点异变】降卒夜里哗变了一座营。刀已经替你递到了手边。' }
      ],
      start: '3-1',
      events: [
        { id: '3-1', title: '新安之夜', key: true,
          segs: ['新安。夜。降卒的营里有人唱关中的歌谣，唱着唱着就哭了。', '诸将来报：秦卒心不信，进关必为变。范增在你身后，久久没有说话。', '杀，还是不杀。'],
          options: [
            { t: '夜击坑之，永绝后患', hist: true, res: '二十万人，一夜坑尽。从此关中父老闻你的名，小儿不敢夜啼。后患是没有了——后患无穷。', eff: { attrs: { shengwang: -15, junxin: -10, weiji: 8 }, dev: 0, flags: ['kengzu'], hist: -25, zg: 10 }, to: '3-2' },
            { t: '收编为军，恩威并施', res: '你拣其精锐编入楚军，老弱给粮遣归。范增看了你一眼，眼里的冰化了一层。', eff: { attrs: { quanshi: 5, shengwang: 5, weiji: 5 }, dev: 10, hist: 10 }, to: '3-2' },
            { t: '尽数遣散，放归关中', req: { caifu: 15 }, res: '二十万双眼睛看着你。放虎归山？还是放人归家？多年后你才知道答案。', eff: { attrs: { caifu: -15, shengwang: 8, quanshi: -8 }, dev: 12, hist: 15 }, to: '3-2' }
          ] },
        { id: '3-2', title: '函谷受阻',
          segs: ['前锋来报：函谷关上有兵守关——沛公已经先破咸阳了。', '你四十万大军怒而破关，进驻鸿门。咸阳的宫灯，就在三十里外。'],
          options: [
            { t: '厉兵秣马，旦日飨士卒', hist: true, res: '你下令旦日会战。曹无伤的告密就放在案上：沛公欲王关中。范增说：急击勿失。', eff: { attrs: { quanshi: 3, weiji: 3 }, dev: 0 }, to: '3-3' },
            { t: '缓兵三日，先观其变', res: '你把战期往后压了压。范增的眉头，又深了一寸。', eff: { attrs: { weiji: -3, junxin: -3 }, dev: 5 }, to: '3-3' }
          ] },
        { id: '3-3', title: '鸿门宴', key: true,
          segs: ['沛公带百余骑来谢。席间，范增举所佩玉玦者三，你默然不应。', '范增起，出，召项庄：“君王为人不忍，请以剑舞，因击沛公于坐杀之。”', '剑光起来了。你的手指，按在案上。'],
          options: [
            { t: '默然纵之，放刘归灞上', hist: true, res: '项庄的剑被项伯挡了三次。樊哙闯帐，你赐了卮酒。沛公起如厕，一去不回。范增摔了玉斗：竖子不足与谋！', eff: { attrs: { junxin: 3, shengwang: 3 }, dev: 0, flags: ['zongliu'], ach: 'hongmen', merit: '鸿门' }, to: 'NEXT' },
            { t: '举玦为号，帐中杀刘', req: { flag: 'fanzeng' }, res: '你终于举起了手。项庄的剑，这次没有项伯能挡。', eff: { attrs: { weiji: 20, shengwang: -8 }, dev: 40 },
              to: [ { if: { quanshi: 40, caixue: 45 }, to: { ending: 'E7' } }, { to: '3-3b' } ] },
            { t: '留刘为质，不放不归', res: '你扣下了沛公。关中无主，诸侯侧目——范增叹道：此亦失算。', eff: { attrs: { weiji: 15, junxin: -8 }, dev: 20 }, to: 'NEXT' }
          ] },
        { id: '3-3b', title: '鸿门变起',
          segs: ['剑已出鞘，沛公的亲兵也亮了刀。项伯挡在中间，樊哙撞开了帐门。', '杀，变成了乱；乱，正在变成你的笑话。'],
          options: [
            { t: '强令收束，纵刘出帐', res: '你喝止了项庄。沛公走了，带着一身冷汗和一辈子的记性。', eff: { attrs: { weiji: 10, shengwang: -5 }, dev: 10 }, to: 'NEXT' },
            { t: '一不做二不休，追而杀之', res: '沛公的马快，你的追兵更快——但灞上的十万汉军，比你的追兵更近。', eff: { attrs: { weiji: 20 }, dev: 15 }, to: { ending: 'E8', variant: 'guling' } }
          ] }
      ]
    },
    /* ---------- 第四章 ---------- */
    {
      id: 'c4', title: '第四章 ｜ 分封', sub: '前 206',
      summaryNotes: [
        '咸阳的火，烧了三个月。有人劝你留，有人劝你走——你只想回家。',
        '十八颗印绶分出去那天，诸侯谢恩。没人看见，桌子底下已经各自磨刀。'
      ],
      intro: ['你进咸阳。秦宫室、府库、子女、玉帛，都在你的兵锋之下。', '有人劝你：关中阻山河四塞，地肥饶，可都以霸。你望着东边，只想彭城。'],
      start: '4-1',
      events: [
        { id: '4-1', title: '咸阳三月',
          segs: ['你下令：屠咸阳，杀子婴，烧秦宫室。大火三月不灭。', '⟦韩生⟧谏曰：“关中阻山河四塞，地肥饶，可都以霸。”你说：“富贵不归故乡，如衣绣夜行。”韩生退而叹曰：“人言楚人沐猴而冠耳，果然。”'],
          options: [
            { t: '收宝货妇女而东', hist: true, res: '你烹了韩生，车载宝货东归。关中的民心，和那把火一起烧成了灰。', eff: { attrs: { caifu: 15, shengwang: -8, junxin: -5 }, dev: 0, hist: -15 }, to: '4-2' },
            { t: '约法安民，择都关中', res: '你按住了那把火。约法三章，秦民稍安，府库整收。范增第一次对你露出了笑。', eff: { attrs: { caifu: 10, shengwang: 8, junxin: 8, quanshi: 5 }, dev: 12, hist: 15 }, to: '4-2' },
            { t: '烧而不屠，火后徙都', res: '宫室烧了，人留下了。一半的火，换一半的骂名。', eff: { attrs: { caifu: 8, shengwang: -3, junxin: -3 }, dev: 5, hist: -5 }, to: '4-2' },
            { t: '事了拂衣，归老吴中', res: '你把大王的印绶留在了彭城，只身回了吴中。多年后乡人问咸阳事，你说：火太大，看不见。', eff: { dev: 8 }, to: { ending: 'E3' } }
          ] },
        { id: '4-2', title: '分封十八王',
          segs: ['你自立为西楚霸王，王九郡，都彭城；分封十八王，天下重画。', '徙义帝于长沙郴县。江上的船，载着那位牧羊出身的皇帝，越走越远。'],
          options: [
            { t: '尊义帝以虚名，不加害', res: '义帝老死于长沙。诸侯嘴上不说，心里都松了一口气。', eff: { attrs: { junxin: 8, shengwang: 5 }, dev: 5, hist: 10 }, to: '4-3' },
            { t: '密令英布等杀之江中', hist: true, res: '义帝沉于江。你说服自己：天下第一人，不容二主。楚地的人心，从这一天开始漏风。', eff: { attrs: { shengwang: -12, junxin: -8, weiji: 8 }, dev: 0, flags: ['shiyidi'], hist: -20, merit: '分封', ach: 'bawang', zg: 15 }, to: '4-3' },
            { t: '废为庶人，幽于彭城', res: '你把皇帝关在自己眼皮底下。杀没有杀，尊没有尊——两头的好处都没占到，两头的骂名都占了。', eff: { attrs: { junxin: -5, shengwang: -5, weiji: 5 }, dev: 8, merit: '分封', ach: 'bawang' }, to: '4-3' }
          ] },
        { id: '4-3', title: '诸侯就国',
          segs: ['十八王就国，你的霸王业达到顶点。彭城的宫殿里，天下的地图挂在墙上。', '齐国的田荣，已经在磨刀了；汉中的刘邦，也在烧栈道的灰里看着东方。'],
          options: [
            { t: '遣使镇抚，以恩结之', res: '使者四出，金帛随行。诸侯谢恩的声音很齐，心思却各有各的齐。', eff: { attrs: { caifu: -5, junxin: 5, weiji: -3 }, dev: 0 }, to: 'NEXT' },
            { t: '陈兵示威，以威服之', res: '你的军旗巡行诸侯之境。臣服的声音更齐了，只是夜里又多了几封密信。', eff: { attrs: { quanshi: 5, weiji: 5, junxin: -3 }, dev: 0 }, to: 'NEXT' }
          ] }
      ]
    },
    /* ---------- 第五章 ---------- */
    {
      id: 'c5', title: '第五章 ｜ 彭城与荥阳', sub: '前 205—前 203',
      summaryNotes: [
        '彭城那一战，三万人追着五十六万人杀。可你渐渐发现：仗越赢，朋友越少。',
        '范增走的那天，疽发背，死在路上。你失去的不是一个谋士，是最后一面镜子。'
      ],
      intro: ['田荣反齐，你北击之，烧其城郭——齐人相聚而畔。', '刘邦趁你陷在齐地，合五十六万之众，端了你的彭城。你回师的时候，只带了三万精骑。'],
      start: '5-1',
      events: [
        { id: '5-1', title: '彭城三万',
          segs: ['你留诸将击齐，自以三万精骑夜袭彭城。', '汉军犹在梦中。穀泗之水，一日不流；睢水之上，尸塞川原——五十六万，就这样碎在你手里。', '这是你最辉煌的一天。也是最危险的一天：仗赢得太快，快到诸侯以为你不可战胜——也不可共存。'],
          options: [
            { t: '乘胜穷追，直取荥阳', hist: true, res: '你追汉王至荥阳，楚汉的战争，从此变成拉锯的磨盘。', eff: { attrs: { quanshi: 10, shengwang: 10, weiji: 5 }, dev: 0, merit: '彭城', ach: 'pengcheng' }, to: '5-2' },
            { t: '胜而不穷，收兵稳守', res: '你收兵保彭城。刘邦捡回一条命，也捡回了喘息的时间。', eff: { attrs: { weiji: -5, shengwang: 3, junxin: 3 }, dev: 5 }, to: '5-2' }
          ] },
        { id: '5-2', title: '成皋相持',
          segs: ['楚汉久相持于荥阳、成皋之间。汉军食敖仓，你的粮道却被彭越一年挠了七回。', '陈平的反间书，悄悄送进了你的大营——上面写着范增的名字。'],
          options: [
            { t: '捕风捉影，疏远范增', hist: true, res: '范增大怒：“天下事大定矣，君王自为之！”赐骨归乡，未至彭城，疽发背而死。你的镜子，碎了。', eff: { attrs: { caixue: -5, junxin: -5, weiji: 5 }, dev: 0, rmflags: ['fanzeng'], hist: -15 }, to: '5-3' },
            { t: '察其诈，留范增不疑', req: { flag: 'fanzeng' }, res: '你把反间书扔进火盆。范增看了你很久，第一次叫了你的字：“籍。”', eff: { attrs: { junxin: 5, caixue: 3 }, dev: 10, hist: 10 }, to: '5-3' },
            { t: '明贬暗保，将计就计', req: { caixue: 55 }, res: '你佯怒逐范增，暗中使人护其归乡。陈平的书，白写了。', eff: { attrs: { weiji: 5, junxin: -3 }, dev: 8 }, to: '5-3' }
          ] },
        { id: '5-3', title: '鸿沟之约', key: true,
          segs: ['韩信已破赵齐，彭越数反梁地，你的粮道越掐越细。', '汉王使侯公来说：中分天下，割鸿沟以西者为汉，鸿沟而东者为楚。汉王归你父母妻子。'],
          options: [
            { t: '许之，引兵东归', hist: true, res: '你引兵解而东归。身后的汉王，已经在撕那份墨迹未干的约书了。', eff: { attrs: { weiji: -5, junxin: 3 }, dev: 0, ach: 'honggou' }, to: 'NEXT' },
            { t: '不许，提兵再决胜负', req: { quanshi: 50, caifu: 15 }, res: '你撕了约书：天下只能有一个主人。粮道的问题，你赌在冬前解决。', eff: { attrs: { weiji: 15, junxin: -5 }, dev: 15 },
              to: [ { if: { flag: 'fanzeng', weijiMax: 59 }, to: { ending: 'E5' } }, { if: { caixue: 55, weijiMax: 69 }, to: { ending: 'E5' } }, { to: '5-3b' } ] },
            { t: '许之，而暗增戒备', res: '你签了约，也把斥候撒到了鸿沟两岸。汉王背约追来时，你的阵脚是齐的。', eff: { attrs: { weiji: -3, caixue: 2 }, dev: 8 }, to: 'NEXT' }
          ] },
        { id: '5-3b', title: '成皋决胜',
          segs: ['你再围成皋。这一回，敖仓的粮尽了，汉军的旌旗开始散乱。', '范增若在，他会说：就是现在。'],
          options: [
            { t: '总攻成皋，一鼓而下', res: '成皋破，巩洛危。刘邦仓皇西窜，你却没有追——你知道，这一仗赢的是局面，不是终局。', eff: { attrs: { weiji: 15 }, dev: 20 },
              to: [ { if: { flag: 'fanzeng' }, to: { ending: 'E5' } }, { to: { ending: 'E4' } } ] }
          ] }
      ]
    },
    /* ---------- 第六章 节点N3 ---------- */
    {
      id: 'c6', title: '第六章 ｜ 垓下·乌江', sub: '前 202 · 历史节点 · 全剧本枢纽',
      summaryNotes: [
        '史书行到此处，只剩最后一页。垓下的歌，东城的雪，乌江的水，都在这一页里。'
      ],
      intro: ['汉王背约，与韩信、彭越会于垓下。兵少食尽，汉军及诸侯兵围之数重。', '夜里，你听清了那四面歌声是什么——楚歌。是你的楚人，在敌人的阵里唱你的乡音。'],
      node: 'N3',
      start: '6-1',
      events: [
        { id: '6-1', title: '垓下楚歌',
          segs: ['你夜起饮帐中，悲歌慷慨：“力拔山兮气盖世，时不利兮⟦乌骓⟧不逝。骓不逝兮可奈何，虞兮虞兮奈若何！”', '⟦虞姬⟧和之。左右皆泣，莫能仰视。', '歌罢，你点起八百精骑，溃围南出。'],
          options: [
            { t: '溃围南出，直取东城', hist: true, res: '夜色的口子撕开又合上。出围时，八百人跟住了你。', eff: { attrs: { weiji: 10 }, dev: 0, flags: ['yu'], ach: 'gai' }, to: '6-2' },
            { t: '遣骑四散，自领疑兵', res: '你分兵四队，汉军不知你在哪一路。出围时，身边的骑少了一半，追兵也散了一半。', eff: { attrs: { weiji: -5, caixue: 3, quanshi: -5 }, dev: 5 }, to: '6-2' }
          ] },
        { id: '6-2', title: '阴陵迷道',
          segs: ['至阴陵，迷失道。你问一田父，田父绐曰：“左。”', '左，乃陷大泽中。泥沼没到马腹，汉军追骑的烟尘，已经在身后了。'],
          options: [
            { t: '弃马步涉，夺路而东', hist: true, res: '你弃马涉水，残骑相随出泽。这一陷，丢了半日光阴——和最后的生机。', eff: { attrs: { weiji: 10, caifu: -5 }, dev: 0 }, to: '6-3' },
            { t: '就地结阵，背泽一战', res: '你勒兵回阵。大泽挡了你的马，也挡了汉军的马。', eff: { attrs: { weiji: 15, shengwang: 5 }, dev: 8 },
              to: [ { if: { caixue: 50, weijiMax: 79 }, to: '6-3' }, { to: { ending: 'E8', variant: 'yinling' } } ] }
          ] },
        { id: '6-3', title: '东城二十八骑',
          segs: ['至东城，乃有二十八骑。汉骑追者数千人。', '你对残骑说：“吾起兵至今八岁矣，身七十馀战，所当者破，所击者服，未尝败北——然今卒困于此，此天之亡我，非战之罪也。”', '“今日固决死，愿为诸君快战：必三胜之，为诸君溃围、斩将、刈旗。”'],
          options: [
            { t: '分骑四向，斩将刈旗', hist: true, res: '四队四向，如约三胜。汉军披靡，斩一都尉，杀数十百人，复聚其骑，亡其两骑耳。', eff: { attrs: { shengwang: 8, weiji: 10 }, dev: 0, ach: 'dongcheng' }, to: '6-4' },
            { t: '并力一路，直插乌江', res: '你不再恋战，二十六骑卷作一股，直冲渡口。', eff: { attrs: { weiji: -5, caixue: 2 }, dev: 5 }, to: '6-4' }
          ] },
        { id: '6-4', title: '乌江', key: true,
          segs: ['乌江亭长檥船待，曰：“江东虽小，地方千里，众数十万人，亦足王也。愿大王急渡。”', '你望着那叶扁舟，身后是八千子弟没有一个人回来的方向。', '“且籍与江东子弟八千人渡江而西，今无一人还——纵江东父兄怜而王我，我何面目见之？”'],
          options: [
            { t: '笑曰：“天之亡我，我何渡为！”', hist: true, res: '你把⟦乌骓⟧送给了亭长，持短兵步战，独杀汉军数百人，身被十馀创。汉购你头千金，邑万户——“吾为若德。”遂自刎。', eff: { attrs: { shengwang: 10 }, dev: 0, hist: 20 }, to: { ending: 'E1' } },
            { t: '受亭长之檥，渡江再砺', res: '你上了船。桨声一起，北岸的烟尘还在追，南岸的灯火已经在等你了。', eff: { attrs: { weiji: -10 }, dev: 40 },
              to: [ { if: { shengwang: 50, notflag: 'shiyidi', devMin: 46 }, to: { ending: 'E6' } }, { if: { shengwang: 40, devMin: 46 }, to: { ending: 'E6' } }, { to: { ending: 'E8' } } ] },
            { t: '回身再战，死不旋踵', res: '你把最后一口气，也留在了北岸。', eff: { attrs: { weiji: 20, shengwang: 5 }, dev: 10, hist: 10 }, to: { ending: 'E1' } }
          ] }
      ]
    }
  ];

  /* ============ 章末历史修正事件池（项羽语境：诸侯/汉间/旧部/江东，凶手动机预兆齐备） ============ */
  var CORRECTIONS = [
    { minDev: 21, maxDev: 45, chance: 0.3, title: '修正 ｜ 营中歌谣',
      segs: ['【历史修正】营里有人唱楚地的旧谣，唱着唱着就骂起了分封。', '你改动的那几颗印绶，动的是人心。'],
      eff: { attrs: { shengwang: -5 }, dev: 0 } },
    { minDev: 21, maxDev: 45, chance: 0.3, title: '修正 ｜ 粮道被抄',
      segs: ['【历史修正】彭越的游兵又抄了你一支粮队。斥候追出三十里，只看到火光。',
             '你改动的每一步，都有人在暗处记账。'],
      eff: { attrs: { caifu: -5, weiji: 3 }, dev: 0 } },
    { minDev: 21, maxDev: 45, chance: 0.3, title: '修正 ｜ 旧部辞行',
      segs: ['【历史修正】一名吴中旧部来辞行：“大王非复吴中之大王矣。”',
             '你改道的每一步，旧日同袍都在重新打量你。'],
      eff: { attrs: { shengwang: -4, weiji: 2 }, dev: 0 } },
    { minDev: 46, maxDev: 70, chance: 1, title: '修正 ｜ 诸侯连叛',
      segs: ['【历史修正】又有两国相率而叛，使者相望于道——不是来朝，是约叛。',
             '你改动的分封格局，正在以叛离的方式自我修正。'],
      eff: { attrs: { weiji: 12, junxin: -5 }, dev: 0 } },
    { minDev: 46, maxDev: 70, chance: 1, title: '修正 ｜ 反间复来',
      segs: ['【历史修正】陈平的第二批反间书到了，这次写得有鼻子有眼。',
             '你改动的人事越多，能编进谣言里的名字就越多。'],
      eff: { attrs: { weiji: 10, junxin: -6 }, dev: 0 } },
    { minDev: 46, maxDev: 70, chance: 1, title: '修正 ｜ 旧敌寻衅',
      segs: ['【历史修正】韩信遣使问罪于楚，措辞一次比一次硬。东线的压力，开始成形。'],
      eff: { attrs: { weiji: 10, quanshi: -4 }, dev: 0 } },
    { minDev: 71, maxDev: 100, chance: 1, title: '修正 ｜ 天命反噬',
      segs: ['【历史修正】你改得太多：叛书、流言、密约从四面压向彭城——历史在用所有人的手，把你推回乌江。'],
      eff: { attrs: { weiji: 18, junxin: -8 }, dev: 0 } },
    { minDev: 71, maxDev: 100, chance: 1, title: '修正 ｜ 楚歌先起',
      segs: ['【历史修正】营外的汉军忽然唱起了楚歌。比垓下早了很多——但你知道，这歌迟早要来的。'],
      eff: { attrs: { weiji: 15, shengwang: -8 }, dev: 0 } },
    { minDev: 71, maxDev: 100, chance: 1, title: '修正 ｜ 江东来信',
      segs: ['【历史修正】江东有变：吴中旧族各据乡曲，已不复听彭城号令。',
             '你改动的历史越大，回头的路就越窄。'],
      eff: { attrs: { weiji: 14, caifu: -8 }, dev: 0 } }
  ];

  /* ============ 成就（GDD 5.6：每剧本 8–12 个） ============ */
  var ACHIEVEMENTS = {
    wanrendi: '万人敌',     // 学万人敌
    yafu: '亚父',           // 礼事范增
    zidii: '八千子弟',      // 会稽收兵八千
    duojun: '安阳夺军',     // 斩宋义，夺上将军
    pofu: '破釜沉舟',       // 沉船破釜，决一死战
    julu: '巨鹿',           // 九战破秦四十万
    hongmen: '鸿门宴',      // 纵刘出帐
    bawang: '西楚霸王',     // 分封自立为霸王
    pengcheng: '彭城三万',  // 三万精骑破汉五十六万
    honggou: '鸿沟之约',    // 与汉中分天下
    dongcheng: '东城二十八骑', // 东城三胜快战
    wujiang: '乌江'         // 达成史实结局 E1
  };

  /* ============ 复盘关键节点 ============ */
  var KEY_NODE_NAMES = { '2-1': '安阳夺军', '3-1': '新安之夜', '3-3': '鸿门宴', '5-3': '鸿沟之约', '6-4': '乌江' };

  /* ============ 随机际遇事件池（40% 概率、每章至多 2 次、章内不重复；to 固定 'RETURN'） ============ */
  var RANDOM_EVENTS = [
    { id: 'R-1', title: '乌骓食槽', chapters: [0, 6],
      segs: ['马夫来报：乌骓这几日不肯就槽，见了生人就扬鬃。', '你走过去，它安静了。'],
      options: [
        { t: '亲自喂它', res: '乌骓就着你的手吃完了一槽料。好马认人，人也该认马。', eff: { attrs: { weiji: -2 }, dev: 0 }, to: 'RETURN' },
        { t: '命人加料', res: '料加了，马瘦了。畜生的心思，不是料能哄的。', eff: { attrs: { caifu: -2 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-2', title: '吴中旧部', chapters: [1, 4],
      segs: ['一名会稽旧部求见：当年的八千子弟，如今老的老、伤的伤，想回家看看。'],
      options: [
        { t: '厚赐遣归', res: '老兵磕头时，营中吴中籍的士卒都红了眼眶。', eff: { attrs: { caifu: -4, shengwang: 3 }, dev: 0 }, to: 'RETURN' },
        { t: '不准所请', res: '老兵没说什么，第二天就不见了。', eff: { attrs: { shengwang: -3, weiji: 2 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-3', title: '范增弈棋', chapters: [1, 6], cond: { flag: 'fanzeng' },
      segs: ['亚父召你弈棋。落子到一半，他忽然说：棋如用兵，亦如用人——大王可知错在何处？'],
      options: [
        { t: '虚心请教', res: '一局终了，他替你复盘的不只是棋。', eff: { attrs: { caixue: 3, junxin: 2 }, dev: 0 }, to: 'RETURN' },
        { t: '笑顾而言他', res: '范增笑了笑，把棋子收回匣中。有些话，只说给想听的人。', eff: { attrs: { weiji: -1 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-4', title: '猎于郊野', chapters: [0, 5],
      segs: ['秋高气爽，诸将约你出猎。弓马之乐，久不曾有了。'],
      options: [
        { t: '欣然同猎', res: '一日三获，诸将皆呼万岁。弓马是放松了，弦也松了些。', eff: { attrs: { weiji: -3, shengwang: 2 }, dev: 0 }, to: 'RETURN' },
        { t: '以军务辞', res: '你把猎期往后推了推。诸将扫兴，斥候却带回了好消息。', eff: { attrs: { caixue: 2 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-5', title: '诸侯来朝', chapters: [4, 6], cond: { quanshi: 40 },
      segs: ['两位诸侯王亲自来彭城朝见，献礼甚厚，言辞极恭。', '殿上的礼数越足，你越想笑。'],
      options: [
        { t: '加厚赐以结之', res: '厚赏下去，两位诸侯感恩而退。今年的盟约，又稳了一分。', eff: { attrs: { caifu: -6, junxin: 4 }, dev: 0 }, to: 'RETURN' },
        { t: '以威仪慑之', res: '你让他们在殿下站了一个时辰。出去时，两位的后背都是湿的。', eff: { attrs: { quanshi: 3, junxin: -3, weiji: 3 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-6', title: '伤兵归乡', chapters: [1, 6],
      segs: ['一批重伤难愈的士卒请归乡里。军中法：伤残者汰。'],
      options: [
        { t: '给足遣资，遣医随行', res: '伤兵叩首离去。军中都说：跟着大王，残了也有着落。', eff: { attrs: { caifu: -4, shengwang: 3 }, dev: 0 }, to: 'RETURN' },
        { t: '按法汰之', res: '法就是法。只是那天夜里，营里的歌声低了几分。', eff: { attrs: { caifu: -2, shengwang: -3 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-7', title: '英布献俘', chapters: [3, 5],
      segs: ['英布遣人献俘数百，附言：愿为大王前驱。', '这个九江王的殷勤，总是恰到好处地多一分。'],
      options: [
        { t: '受其俘，厚赏来使', res: '来使归报，英布愈发恭顺。这种人，可用，不可信。', eff: { attrs: { quanshi: 3, weiji: 3 }, dev: 0 }, to: 'RETURN' },
        { t: '却而不受', res: '俘虏原路退回。英布的来使走时，眼神深了深。', eff: { attrs: { shengwang: 3, weiji: 2 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-8', title: '楚人献粮', chapters: [4, 6],
      segs: ['彭城父老结队送粮至营，老者拄杖在前：楚兵护楚，理所当然。'],
      options: [
        { t: '拜受而倍偿其值', res: '父老们推辞不过，收了钱，逢人便夸。', eff: { attrs: { caifu: -4, shengwang: 4 }, dev: 0 }, to: 'RETURN' },
        { t: '拜受，书券为凭', res: '你写下借券，言明战后倍偿。老者把券供了起来。', eff: { attrs: { shengwang: 3 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-9', title: '反间流言', chapters: [4, 6], cond: { weiji: 40 },
      segs: ['营中忽有流言：某某通汉，其辞凿凿。诸将请你彻查。'],
      options: [
        { t: '按下不查', res: '你只回了四个字：我信得过。流言三日自息。', eff: { attrs: { weiji: -3, junxin: 2 }, dev: 0 }, to: 'RETURN' },
        { t: '明令彻查', res: '查了十日，一无所获——人心却查散了一层。', eff: { attrs: { weiji: 5, junxin: -3 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-10', title: '虞姬夜话', chapters: [3, 6],
      segs: ['夜里，虞姬为你添衣。她不问军情，只问：大王的眉头，几时能展？'],
      options: [
        { t: '与她说说心里话', res: '有些话说出口，才知道自己有多累。', eff: { attrs: { weiji: -3 }, dev: 0 }, to: 'RETURN' },
        { t: '笑而不答', res: '你替她拢了拢被角。军人的心事，不必过问她。', eff: { attrs: { weiji: -1 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-11', title: '斥候急报', chapters: [2, 6],
      segs: ['斥候连夜来报：北面有兵马异动，旗号不明。'],
      options: [
        { t: '亲率轻骑往探', res: '虚惊一场，是迁民的流人。你安抚了他们，又得一邑之心。', eff: { attrs: { weiji: -2, shengwang: 2 }, dev: 0 }, to: 'RETURN' },
        { t: '遣偏将查之', res: '偏将回报：流民三千。你拨了粮，也拨了人盯着。', eff: { attrs: { caifu: -3 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-12', title: '乌江亭长', chapters: [6, 6],
      segs: ['乌江亭长提前泊船在渡口，日日擦拭那叶扁舟。', '他说：江上风大，船总要备好的。'],
      options: [
        { t: '谢其好意', res: '你望着那叶扁舟，忽然想起了八千张脸。', eff: { attrs: { weiji: -2 }, dev: 0 }, to: 'RETURN' },
        { t: '挥之使去', res: '亭长欲言又止，把船又泊回了原处。', eff: { dev: 0 }, to: 'RETURN' }
      ] }
  ];

  /* ============ 危机高值事件（GDD 4.1） ============ */
  var CRISIS_EVENTS = {
    plots: [
      { id: 'C-1', title: '诸侯叛讯',
        segs: ['一夜三报：淮南、临江、九江，各执兵戈，辞以“讨逆”。', '预兆早有——上月会盟，三王的使者都只派了副使来。', '你改动的人事，正在以叛离的形式自我清算。'],
        options: [
          { t: '亲征其一，慑服其余', res: '你亲提三万南下，一战而下淮南。其余两国，连夜上书谢罪。', eff: { attrs: { weiji: -8, quanshi: 3, caifu: -5 }, dev: 0 }, to: 'RETURN' },
          { t: '遣使责问', res: '使者被逐了两回。叛者没有倒戈，观望者先学会了报价。', eff: { attrs: { weiji: 6 }, dev: 0 }, to: 'RETURN' }
        ] },
      { id: 'C-2', title: '反间之信',
        segs: ['截获汉使细作一名，行囊中有给你的"亲启书"——措辞亲昵得可疑。', '若此书公开，你与范增之间，就再也说不清了。'],
        options: [
          { t: '当众焚书，并召范增共观', res: '范增看着火盆，长出一口气。反间者的钱，白花了。', eff: { attrs: { weiji: -6, junxin: 3 }, dev: 0 }, to: 'RETURN' },
          { t: '压下不表', res: '你把书压进了箱底。夜里想了很久——想的人多了，事就变了味。', eff: { attrs: { weiji: 5 }, dev: 0 }, to: 'RETURN' }
        ] },
      { id: 'C-3', title: '粮道断绝',
        segs: ['彭越的游兵连日掐你的粮道，前锋各营已经开始减餐。', '军中开始有人私下宰杀战马。'],
        options: [
          { t: '亲督护粮，剿抚兼施', res: '你亲率精骑护了三趟，彭越暂避。粮道通了，马也保住了。', eff: { attrs: { weiji: -6, quanshi: 2 }, dev: 0 }, to: 'RETURN' },
          { t: '就地征发', res: '粮是征来了，彭城周边的百姓，看楚军的眼神却变了。', eff: { attrs: { caifu: 6, shengwang: -5, weiji: 4 }, dev: 0 }, to: 'RETURN' }
        ] }
    ],
    death: { id: 'C-DEATH', title: '杀机已至',
      segs: ['诸侯联军合围彭城，汉军的赤帜已经能看见。你的亲兵在清点最后的车马。', '乌骓在槽边不安地刨着地——它比你先感觉到了。', '你还有最后一次挣扎的机会。'],
      options: [
        { t: '尽散府库，收拢溃军', req: { caifu: 30 }, res: '府库一空，溃军复聚。彭城守住了——这一次。', eff: { attrs: { caifu: -30, weiji: -25 }, dev: 0 }, to: 'RETURN' },
        { t: '亲犯矢石，决死突围', req: { caixue: 60 }, res: '你亲持画戟开路，三军随之。围是突出来了，血也流够了。', eff: { attrs: { weiji: -15, shengwang: -5 }, dev: 0 }, to: 'RETURN' },
        { t: '困守孤城', res: '你闭上眼，听城外的楚歌。', eff: { attrs: { weiji: 15 }, dev: 0 }, to: 'RETURN' }
      ] }
  };

  /* ============ 主动行动（行动卡回合制；通用 6 + 章定制 6，每章池恒 12，共 48） ============
   * 数值口径：单项 ≤±8、zg ≤±5、不写 flags/hist/merit、dev 恒 0。
   * chapters:[起,止]：0 吴中 / 1 起兵 / 2 安阳巨鹿 / 3 鸿门 / 4 分封 / 5 荥阳 / 6 垓下。 */
  var ACTIONS = [
    /* ---- 通用行动（全章可用） ---- */
    { id: 'XY-ACT-1', name: '校场演武', desc: '亲赴校场，以武统军', chapters: [0, 6],
      eff: { attrs: { quanshi: 3, shengwang: 2, weiji: 2 }, dev: 0 },
      res: '三场演武，三军心服。老兵说：跟着大王，死也值。' },
    { id: 'XY-ACT-2', name: '置酒高会', desc: '置酒结客（财富-8）', req: { caifu: 8 }, chapters: [0, 6],
      eff: { attrs: { caifu: -8, shengwang: 4, junxin: 2 }, dev: 0 },
      res: '一场大宴，宾主尽欢。散场时，多了几个肯替你说话的人。' },
    { id: 'XY-ACT-3', name: '入朝问安', desc: '趋府问安，以固人心（需起兵）', req: { minChapter: 1 }, chapters: [0, 6],
      eff: { attrs: { junxin: 5, weiji: 2 }, dev: 0 },
      res: '你在阶下站了半个时辰，换来三句寒暄。值不值，看你怎么算。' },
    { id: 'XY-ACT-4', name: '闭门读阵', desc: '谢客静修，温习阵图', chapters: [0, 6],
      eff: { attrs: { caixue: 3, weiji: -2 }, dev: 0 },
      res: '门一关，阵图铺了满案。这一夜，你的兵又精了一分。' },
    { id: 'XY-ACT-5', name: '散财养士', desc: '厚币招贤（财富-8）', req: { caifu: 8 }, chapters: [0, 6],
      eff: { attrs: { caifu: -8, weiji: -6, shengwang: 3 }, dev: 0 },
      res: '千金散尽，门下多了几十张嘴，也多了几十双替你看路的眼睛。' },
    { id: 'XY-ACT-6', name: '称病蛰伏', desc: '闭门称病，避人锋芒（需起兵）', req: { minChapter: 1 }, chapters: [0, 6],
      eff: { attrs: { weiji: -8, quanshi: -3, junxin: -2 }, dev: 0 },
      res: '病假条递上去，麻烦少了一半。探病的人来了几拨，真心难辨。' },

    /* ---- 章 0：吴中 ---- */
    { id: 'XY-ACT-7', name: '举鼎立威', desc: '举鼎于市，以力服众', chapters: [0, 0],
      eff: { attrs: { shengwang: 4, weiji: 2 }, dev: 0 },
      res: '千斤之鼎过顶，满市皆呼。吴中的少年，自此不敢与你比肩。' },
    { id: 'XY-ACT-8', name: '教授剑术', desc: '教里中儿剑，以技易粟', chapters: [0, 0],
      eff: { attrs: { caifu: 4, weiji: 2 }, dev: 0 },
      res: '束脩不多，够吃半月。孩子们练得起劲，你看得也起劲。' },
    { id: 'XY-ACT-9', name: '结交豪杰', desc: '折节下交（财富-3）', req: { caifu: 3 }, chapters: [0, 0],
      eff: { attrs: { caifu: -3, shengwang: 3 }, dev: 0 },
      res: '三教九流都认得你了。乱世里，名单就是路。' },
    { id: 'XY-ACT-10', name: '夜读兵阵', desc: '挑灯读阵，以谋补勇', chapters: [0, 0],
      eff: { attrs: { caixue: 3 }, dev: 0 },
      res: '兵书难啃，啃下来就是你的。万人敌，先得读过万人之书。' },
    { id: 'XY-ACT-11', name: '游猎郊野', desc: '驰马试剑，且放形骸', chapters: [0, 0],
      eff: { attrs: { weiji: -4 }, dev: 0 },
      res: '一日三获，风把胸口吹得透亮。' },
    { id: 'XY-ACT-12', name: '征发乡勇', desc: '编练乡曲，以观人材', chapters: [0, 0],
      eff: { attrs: { quanshi: 3 }, dev: 0 },
      res: '哪些人能战、哪些人能用，你心里的册子又厚了一页。' },

    /* ---- 章 1：起兵 ---- */
    { id: 'XY-ACT-13', name: '操练八千', desc: '亲训子弟兵', chapters: [1, 1],
      eff: { attrs: { quanshi: 4, weiji: 2 }, dev: 0 },
      res: '八千子弟，号令如一。这八千个名字，你都叫得出来。' },
    { id: 'XY-ACT-14', name: '安抚会稽', desc: '绥靖郡城（财富-3）', req: { caifu: 3 }, chapters: [1, 1],
      eff: { attrs: { caifu: -3, shengwang: 3 }, dev: 0 },
      res: '米价稳了，人心定了。会稽人开始认这面楚旗。' },
    { id: 'XY-ACT-15', name: '搜缴军械', desc: '收兵刃于民间', chapters: [1, 1],
      eff: { attrs: { caifu: 4, weiji: 3 }, dev: 0 },
      res: '府库多了三千副甲。有人夜里咬牙，有人夜里磨刀。' },
    { id: 'XY-ACT-16', name: '礼贤下士', desc: '礼敬耆老（财富-3）', req: { caifu: 3 }, chapters: [1, 1],
      eff: { attrs: { caifu: -3, shengwang: 3 }, dev: 0 },
      res: '你亲自登门的几位老成，如今逢人便说项氏的好处。' },
    { id: 'XY-ACT-17', name: '加固城防', desc: '修垒固防，深根固本', chapters: [1, 1],
      eff: { attrs: { quanshi: 3 }, dev: 0 },
      res: '城防连成一线。守得住的根据地，才是根据地。' },
    { id: 'XY-ACT-18', name: '探秦虚实', desc: '遣人觇关中消息', chapters: [1, 1],
      eff: { attrs: { caixue: 3, weiji: 2 }, dev: 0 },
      res: '秦廷的每一条消息你都听了三遍。天下的裂缝，你看得清。' },

    /* ---- 章 2：安阳巨鹿 ---- */
    { id: 'XY-ACT-19', name: '激励士卒', desc: '巡营鼓气，以振军心', chapters: [2, 2],
      eff: { attrs: { shengwang: 3, weiji: 2 }, dev: 0 },
      res: '你走过的地方，士卒的胸膛都挺高了一寸。' },
    { id: 'XY-ACT-20', name: '检视军粮', desc: '亲核粮账，以安三军', chapters: [2, 2],
      eff: { attrs: { caifu: 3 }, dev: 0 },
      res: '粮官的三笔假账被你翻了出来。军中从此没人敢在粮上做手脚。' },
    { id: 'XY-ACT-21', name: '与诸将宴', desc: '设宴结心（财富-3）', req: { caifu: 3 }, chapters: [2, 2],
      eff: { attrs: { caifu: -3, shengwang: 3, junxin: 2 }, dev: 0 },
      res: '酒过三巡，几个别部将领的话也热络了。人心要一碗一碗焐。' },
    { id: 'XY-ACT-22', name: '夜巡营垒', desc: '亲巡夜哨，以肃军纪', chapters: [2, 2],
      eff: { attrs: { weiji: -3 }, dev: 0 },
      res: '你查到第三座营时，偷睡的两个哨兵从此不敢合眼。' },
    { id: 'XY-ACT-23', name: '研读阵图', desc: '推演巨鹿地势', chapters: [2, 2],
      eff: { attrs: { caixue: 3 }, dev: 0 },
      res: '漳水的深浅、甬道的走向，都在你脑中展开成图。' },
    { id: 'XY-ACT-24', name: '抚问伤兵', desc: '厚恤伤亡（财富-3）', req: { caifu: 3 }, chapters: [2, 2],
      eff: { attrs: { caifu: -3, shengwang: 2, weiji: -2 }, dev: 0 },
      res: '伤者得恤，死者得葬。士卒知将军不弃人。' },

    /* ---- 章 3：鸿门 ---- */
    { id: 'XY-ACT-25', name: '整肃降卒', desc: '编练新附之众', chapters: [3, 3],
      eff: { attrs: { quanshi: 3, weiji: 3 }, dev: 0 },
      res: '降卒混编入楚，日日操练。用好了是军，用不好是火。' },
    { id: 'XY-ACT-26', name: '清点府库', desc: '核收秦之府库', chapters: [3, 3],
      eff: { attrs: { caifu: 5, shengwang: -2 }, dev: 0 },
      res: '府库的账核清了，咸阳的宝货也看清了。有人欢喜有人眼红。' },
    { id: 'XY-ACT-27', name: '问计亚父', desc: '就范增问计（需范增在侧）', req: { flag: 'fanzeng' }, chapters: [3, 3],
      eff: { attrs: { caixue: 3, junxin: 2 }, dev: 0 },
      res: '老人家的三句话，值你三夜长考。' },
    { id: 'XY-ACT-28', name: '犒赏三军', desc: '以私财犒军（财富-4）', req: { caifu: 4 }, chapters: [3, 3],
      eff: { attrs: { caifu: -4, shengwang: 3 }, dev: 0 },
      res: '酒肉到营，士气大振。士兵记得项王的赏。' },
    { id: 'XY-ACT-29', name: '巡视关防', desc: '亲巡函谷诸隘', chapters: [3, 3],
      eff: { attrs: { quanshi: 2, caixue: 2 }, dev: 0 },
      res: '函谷的天险，你在心里又给刘邦留了一道。' },
    { id: 'XY-ACT-30', name: '压粮备进', desc: '多备军粮，以支大战', chapters: [3, 3],
      eff: { attrs: { caifu: 3, weiji: 2 }, dev: 0 },
      res: '仓廪渐实。旦日若战，三军不会饿着。' },

    /* ---- 章 4：分封 ---- */
    { id: 'XY-ACT-31', name: '安抚秦民', desc: '绥抚关中（财富-3）', req: { caifu: 3 }, chapters: [4, 4],
      eff: { attrs: { caifu: -3, shengwang: 3, weiji: -2 }, dev: 0 },
      res: '关中父老的脸色，一日比一日缓。民心这种东西，急不来。' },
    { id: 'XY-ACT-32', name: '修缮宫室', desc: '修宫治府，以示定居（财富-4）', req: { caifu: 4 }, chapters: [4, 4],
      eff: { attrs: { caifu: -4, quanshi: 3 }, dev: 0 },
      res: '彭城的宫殿一日高过一日。天下的眼睛都看得见你的野心。' },
    { id: 'XY-ACT-33', name: '遣使诸侯', desc: '报聘十八王（财富-3）', req: { caifu: 3 }, chapters: [4, 4],
      eff: { attrs: { caifu: -3, junxin: 2, shengwang: 2 }, dev: 0 },
      res: '使者四出，回话都极恭敬。只是恭敬这个东西，最经不起风。' },
    { id: 'XY-ACT-34', name: '检阅兵籍', desc: '核天下兵籍', chapters: [4, 4],
      eff: { attrs: { quanshi: 3 }, dev: 0 },
      res: '诸侯各有多少兵、多少粮，你心里的册子又厚了一层。' },
    { id: 'XY-ACT-35', name: '收葬遗骸', desc: '收咸阳战骨', chapters: [4, 4],
      eff: { attrs: { shengwang: 3, weiji: -2 }, dev: 0 },
      res: '咸阳城的灰烬里，多了几座新坟，少了几声咒骂。' },
    { id: 'XY-ACT-36', name: '约法于市', desc: '与秦民约法', chapters: [4, 4],
      eff: { attrs: { shengwang: 3, junxin: 2, weiji: 2 }, dev: 0 },
      res: '市口贴了约法。围观的秦民，读了一遍又一遍。' },

    /* ---- 章 5：荥阳 ---- */
    { id: 'XY-ACT-37', name: '护粮通道', desc: '亲督护粮，以保敖仓之路', chapters: [5, 5],
      eff: { attrs: { quanshi: 3, weiji: 2 }, dev: 0 },
      res: '你亲自押了三趟。彭越的游兵，近来收敛了些。' },
    { id: 'XY-ACT-38', name: '截击彭越', desc: '剿击梁地游兵', chapters: [5, 5],
      eff: { attrs: { quanshi: 4, weiji: 3 }, dev: 0 },
      res: '彭越吃了亏，躲得更深了。泥鳅一样的人，抓不如赶。' },
    { id: 'XY-ACT-39', name: '休整精骑', desc: '休养马力，以蓄锐气', chapters: [5, 5],
      eff: { attrs: { weiji: -4 }, dev: 0 },
      res: '三万精骑饱餐休整。下一战，还得靠他们。' },
    { id: 'XY-ACT-40', name: '问计帷幄', desc: '与谋士夜议军情', chapters: [5, 5],
      eff: { attrs: { caixue: 3, junxin: 2 }, dev: 0 },
      res: '舆图前的烛火，烧到了四更。' },
    { id: 'XY-ACT-41', name: '筑垒巩洛', desc: '筑垒以困汉军', chapters: [5, 5],
      eff: { attrs: { quanshi: 3 }, dev: 0 },
      res: '壁垒向巩洛推进了十里。磨盘，就该这么转。' },
    { id: 'XY-ACT-42', name: '募兵淮南', desc: '募新军于淮南（财富-3）', req: { caifu: 3 }, chapters: [5, 5],
      eff: { attrs: { quanshi: 4, caifu: -3, weiji: 2 }, dev: 0 },
      res: '淮南的应募者络绎于途。你的兵源，还没有断。' },

    /* ---- 章 6：垓下乌江 ---- */
    { id: 'XY-ACT-43', name: '聚拢残骑', desc: '收拢溃散之众', chapters: [6, 6],
      eff: { attrs: { quanshi: 3, weiji: 2 }, dev: 0 },
      res: '溃散的人马一点点聚回来。还肯回来的，都是真楚人。' },
    { id: 'XY-ACT-44', name: '激励死士', desc: '以死义气激励残部', chapters: [6, 6],
      eff: { attrs: { shengwang: 3 }, dev: 0 },
      res: '你说：楚虽三户，亡秦必楚。残骑的眼里，火又着了。' },
    { id: 'XY-ACT-45', name: '夜探敌营', desc: '亲探汉军虚实', chapters: [6, 6],
      eff: { attrs: { caixue: 3, weiji: 3 }, dev: 0 },
      res: '你摸到敌营三里之内。围有几重，破绽在哪，你看清了。' },
    { id: 'XY-ACT-46', name: '毁辎疾行', desc: '弃辎重，轻装突围（财富-3）', req: { caifu: 3 }, chapters: [6, 6],
      eff: { attrs: { caifu: -3, weiji: -4 }, dev: 0 },
      res: '辎重烧掉的烟起了三柱。心疼归心疼，命要紧。' },
    { id: 'XY-ACT-47', name: '祭旗突围', desc: '杀牲祭旗，以壮行色', chapters: [6, 6],
      eff: { attrs: { shengwang: 4 }, dev: 0 },
      res: '战旗举起时，八百人没有一个低头。' },
    { id: 'XY-ACT-48', name: '秣马乌江岸', desc: '于乌江岸休整残骑', chapters: [6, 6],
      eff: { attrs: { weiji: -3 }, dev: 0 },
      res: '江水很急，马饮得很饱。对岸的灯火，比北岸的安静。' }
  ];

  /* ============ 历史百科词条 ============ */
  var GLOSSARY = {
    '下相': '秦县，今江苏宿迁。项羽故里。',
    '项梁': '楚将项燕之子，项羽叔父。起兵会稽，败死于定陶。',
    '范增': '居巢人，年七十好奇计，项羽尊为亚父。后中陈平反间，疽发背死。',
    '宋义': '楚怀王所拜上将军，救赵行至安阳留四十六日不进，为项羽所斩。',
    '破釜沉舟': '项羽渡漳水，沉船、破釜甑、烧庐舍，持三日粮示必死——后成成语。',
    '巨鹿': '今河北平乡。前207年项羽九战破章邯四十万，诸侯由是属目。',
    '章邯': '秦末名将，巨鹿败后降楚，后封雍王，最终败死于韩信之手。',
    '新安': '今河南渑池东。项羽夜坑秦降卒二十余万于此。',
    '鸿门宴': '前206年项羽设宴鸿门，范增命项庄舞剑欲杀刘邦，沛公终得脱。',
    '项庄': '项羽堂弟。鸿门宴上奉范增命舞剑，意在沛公。',
    '樊哙': '刘邦猛将，屠狗出身。鸿门宴闯帐，嗔目视羽，羽赐卮酒彘肩。',
    '义帝': '楚怀王孙心，初立以从民望。项羽徙之长沙，密令英布杀于江中。',
    '韩生': '说项羽都关中者，以“沐猴而冠”讥之，为羽所烹。',
    '彭城': '今江苏徐州。西楚霸王之都；前205年项羽三万精骑大破汉五十六万于此。',
    '敖仓': '荥阳东北敖山之大粮仓。楚汉相持，汉军恃此不绝。',
    '鸿沟': '古运河，今河南荥阳东南。前203年楚汉中分天下之界。',
    '垓下': '今安徽灵璧东南。前202年项羽兵困于此，四面楚歌。',
    '乌江': '今安徽和县东北乌江浦。项羽自刎处，亭长檥船之地。',
    '乌骓': '项羽坐骑，日行千里。乌江赠予亭长。',
    '虞姬': '项羽美人，常随军中。垓下帐中，羽为悲歌，虞和之。',
    '阴陵': '今安徽定远西北。项羽于此迷道，为田父所绐，陷于大泽。'
  };

  /* ============ 剧本元信息与剧本级配置 ============ */
  var SCENARIO = {
    id: 'xiangyu', name: '项羽 · 霸王之局', sub: '力拔山兮气盖世',
    era: '前 209 — 前 202', protag: '项羽',
    desc: '一个从不打败仗的人，是怎么输掉天下的？',
    recommend: '硬核定位（容错 0–1，建议通关前两剧本后再来）'
  };
  // 主敌威胁/戒心（隐藏值）：项羽剧本 = 诸侯离心
  var HIDDEN = {
    init: 15, name: '诸侯离心', showFrom: 3,
    words: [[70, '众叛亲离'], [50, '叛者四起'], [30, '人心浮动'], [0, '诸侯畏服']]
  };
  // 失宠规则关闭：项羽本人即最高权力者，君心=天下人望——人望崩坏的惩罚由诸侯离心（zg）与危机承担
  var PERSIST = { junxinFrom: 1, junxinShichong: false };
  // 功业标记分值（项羽剧本：军事胜绩）
  var MERIT_MAP = { '起兵': 8, '巨鹿': 20, '鸿门': 10, '分封': 12, '彭城': 20 };

  return {
    ATTRS: ATTRS, ATTR_NAMES: ATTR_NAMES, INIT: INIT, DIFFICULTY: DIFFICULTY,
    SCENARIO: SCENARIO, HIDDEN: HIDDEN, PERSIST: PERSIST, MERIT_MAP: MERIT_MAP,
    DEV_BANDS: DEV_BANDS, ENDINGS: ENDINGS, CHAPTERS: CHAPTERS,
    CORRECTIONS: CORRECTIONS, ACHIEVEMENTS: ACHIEVEMENTS, KEY_NODE_NAMES: KEY_NODE_NAMES,
    RANDOM_EVENTS: RANDOM_EVENTS, CRISIS_EVENTS: CRISIS_EVENTS, ACTIONS: ACTIONS, GLOSSARY: GLOSSARY
  };
});
