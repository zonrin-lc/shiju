/* 《青史生存录》韩信剧本《兵仙之局》剧本数据
 * 与 GDD 附录 F 一一对应。纯数据文件，浏览器与 Node 通用（多剧本架构）。
 * 词条标记：叙事文本中 ⟦词条⟧ 会渲染为可点按的百科入口（见 GLOSSARY）。
 * 属性键：quanshi 权势 / shengwang 声望 / junxin 君心 / caifu 财富 / caixue 才学 / weiji 危机
 * 隐藏值 zg：刘邦疑心（HIDDEN.init=15）
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.HANXIN_DATA = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  var ATTRS = [
    { k: 'quanshi', n: '权势', words: [[80, '军威震主'], [50, '节制万军'], [25, '号为名将'], [0, '身无寸柄']] },
    { k: 'shengwang', n: '声望', words: [[80, '天下属目'], [50, '名震诸侯'], [25, '小有勇名'], [0, '默默无闻']] },
    { k: 'junxin', n: '君心', words: [[70, '解衣推食'], [45, '言听计从'], [20, '上下相安'], [0, '君臣相疑']] },
    { k: 'caifu', n: '财富', words: [[70, '食邑万户'], [40, '仓廪渐足'], [15, '赖以温饱'], [0, '家徒四壁']] },
    { k: 'caixue', n: '才学', words: [[75, '兵仙降世'], [55, '运筹帷幄'], [35, '熟读兵书'], [0, '略识之无']] },
    { k: 'weiji', n: '危机', words: [[90, '命悬一线'], [70, '弓藏之兆'], [40, '暗流涌动'], [0, '岁月静好']], inverse: true }
  ];

  var ATTR_NAMES = { quanshi: '权势', shengwang: '声望', junxin: '君心', caifu: '财富', caixue: '才学', weiji: '危机' };

  var INIT = { quanshi: 5, shengwang: 8, junxin: 12, caifu: 10, caixue: 42, weiji: 8 };

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
      name: '钟室之斩', seal: '循史', cuncun: 25, nitian: false, devMax: 45, ach: ['zhongshi'],
      zhuan: '太史公曰：信以市井布衣，受辱胯下，卒登坛而拜将。还定三秦，举魏拔赵，胁燕定齐，南摧楚军于垓下——汉之所以得天下者，大抵皆信之功也。然功高震主，鸟尽弓藏。云梦一缚，钟室一斩，夷三族。假令信学道谦让，不伐己功，不矜其能，于汉家勋可比周召，血食后世。悔不用蒯通之计，乃为儿女子所诈，岂非天哉！'
    },
    E2: {
      name: '漂母之钓', seal: '苟活', cuncun: 100, nitian: false, ach: ['piaomu'],
      zhuan: '太史公曰：淮阴城下，有钓叟韩生者，日垂一纶，得鱼则喜，不得则歌。或问其名，笑而不答。漂母在日，生每往饭之，岁时不辍。及淮阴侯诛，人始知钓叟谁也。生闻之，投竿于河，终身不复言兵。'
    },
    E3: {
      name: '楚营郎中', seal: '苟活', cuncun: 80, nitian: false,
      zhuan: '太史公曰：信在楚，为郎中，执戟于项羽帐下，数以策干，不用。及汉王入蜀，或劝信亡归，信曰：楚虽不我用，义不可负。后垓下之围，信随众溃，不知所终。天下但知淮阴侯，不知楚营旧郎中——其忠其愚，皆足叹也。'
    },
    E4: {
      name: '王于齐土', seal: '稳健', cuncun: 85, nitian: false, devMin: 21,
      zhuan: '太史公曰：信既破齐，请为齐王，汉王许之。及蒯通说三分，信谢不纳，然亦深自固：缮甲兵，积粮谷，不轻离其国。汉廷数徙之，信以疾辞。高帝终其身，不能夺信之齐。垓下之役既毕，东西相持，鸿沟为界——信王于齐，得全于英雄之末。'
    },
    E5: {
      name: '学道全身', seal: '稳健', cuncun: 95, nitian: false, ach: ['xuedao'],
      zhuan: '太史公曰：信既诛项羽，即日还兵符，请老于淮阴。人皆笑其怯，信曰：狡兔死，走狗烹；高鸟尽，良弓藏——吾欲全吾名，亦全吾身。后十年，绛灌诸将或以诛，或以族，而信钓于城下，饭于漂母之祠，寿终。太史公所谓学道谦让者，信得之矣。'
    },
    E6: {
      name: '三分之局', seal: '逆天', cuncun: 85, nitian: true, devMin: 46,
      zhuan: '太史公曰：蒯通之说既行，信据齐临淄，收燕赵之众，西向而观楚汉之斗。项王蹙于荥阳，汉王疲于成皋，皆请盟于信。信按兵坐观，三分鼎足。后十年，汉楚皆疲，信乃徐收天下之利。兵仙一生，未尝败绩；其最胜处，不在垓下，在齐王宫之一席话也。'
    },
    E7: {
      name: '易帜之夏', seal: '逆天', cuncun: 80, nitian: true, devMin: 46,
      zhuan: '太史公曰：陈豨反于代，信从中应之，周勃樊哙之师逡巡不敢进。高帝亲征，与信遇于洛阳，两军相望，帝曰：淮阴侯必反乎？信对曰：非反也，求己所当得也。遂盟而去，剖大河以北为信国。是岁，汉室易其政，封赏重议——或曰信伪，或曰信直，千载不决。'
    },
    E8: {
      name: '名将之殁', seal: '败局', cuncun: 10, nitian: false,
      zhuan: '太史公曰：信之智，敌万人之军；信之愚，不敌一人之疑。或缚于云梦，或族于钟室，谋泄于帷幄，兵败于一旦。天下已定矣，而名将不得晏然——非信之罪也，势也。',
      variants: {
        yunmeng: { name: '云梦之缚',
          zhuan: '太史公曰：高帝伪游云梦，信郊谒于陈。武士一拥，绳缚加身。信呼曰：狡兔死，走狗烹！帝不应，槛车东去。及淮阴国除，人始悟：云梦之云，早罩在英雄头上。' },
        mouxie: { name: '谋泄之诛',
          zhuan: '太史公曰：陈豨之举未发，舍人上书告变。吕后不动干戈，一使召信，一狱待罪。信至长乐，钟室门阖。谋泄于人，亦泄于天——帐中百万兵，救不得殿上一命。' },
        weishui: { name: '潍水覆军',
          zhuan: '太史公曰：信读兵书半生，一战而失其算。潍水合围，沙囊溃堤，汉儿郎溺死者蔽川。信单骑而遁，不知所之。兵无常胜，水无常形——渎之者，其验如响。' }
      }
    }
  };

  /* ============ 章节与事件 ============
   * 关键 Flag：piaomu-en 漂母之恩 / kuaxia 胯下隐忍 / tenggong 滕公之救 / xiaohe 萧何知己 /
   *   yangqu 扬言欲去 / hanzhongdui 汉中对 / zuoche 师事左车 / poqi 破齐 /
   *   conghan 从汉 / xuli 阴蓄 / zhongli 钟离眜之庇 / chenxi 陈豨之盟
   * 战役判定（陈仓/背水/潍水）走 to 条件数组：史实选项永远可选，才学不足则败入兜底线。
   */
  var CHAPTERS = [
    /* ---------- 序章 ---------- */
    {
      id: 'c0', title: '序章 ｜ 淮阴布衣', sub: '教学章 · 约前 220 前后',
      summaryNotes: [
        '【教学】上方六维是你的命数。危机涨满之日，便是钟室门阖之时。',
        '【教学】偏离度记你与史实的距离，只增不减：≤20 循史，21–45 微澜，46–70 改流，71 以上逆天。',
        '【教学】选项旁带"史"字者，是史书所载韩信的本来面目。循之则稳，违之则波澜自生。'
      ],
      intro: [
        '你是⟦淮阴⟧城的一个布衣。贫，无行，不事生产，每天抱着一卷翻烂的兵书，去城下钓鱼。',
        '史书上还没有你的名字。它要等一个乱世，和一座登坛。'
      ],
      start: '0-1',
      events: [
        { id: '0-1', title: '城下之钓',
          segs: ['钓了半日，鱼篓空空。河边洗衣的⟦漂母⟧见了，把饭团分给你——一连几十日，天天如此。', '你捧着饭，喉咙里堵着一句话。'],
          options: [
            { t: '受饭，立誓“吾必有以重报母”', hist: true, res: '漂母把手一摆：“大丈夫不能自食，吾哀王孙而进食，岂望报乎！”你记住了这句话，也记住了这饭。', eff: { attrs: { shengwang: 2 }, dev: 0, flags: ['piaomu-en'], ach: 'piaomu' }, to: '0-2' },
            { t: '受饭，默然铭记', res: '你没有说话。有些恩，说出来就轻了。', eff: { attrs: { caixue: 2 }, dev: 3, flags: ['piaomu-en'] }, to: '0-2' },
            { t: '不食，转身离去', res: '你饿着肚子走了。身后漂母看了很久，叹了口气。', eff: { attrs: { shengwang: 3, weiji: 3 }, dev: 5 }, to: '0-2' }
          ] },
        { id: '0-2', title: '胯下之辱',
          segs: ['市上有个屠中少年拦住你：“若虽长大，好带刀剑，中情怯耳。”', '“能死，刺我；不能死，出我⟦胯下⟧。”围观的人越来越多。'],
          options: [
            { t: '俯身，从其胯下钻过', hist: true, res: '你从他的胯下爬了过去，满市皆笑。你拍拍土，走得不快不慢——忍人所不能忍，才能成人所不能成。', eff: { attrs: { weiji: -3, shengwang: -3 }, dev: 0, flags: ['kuaxia'], ach: 'kuaxia' }, to: '0-3' },
            { t: '拔剑而起', res: '剑出鞘半寸，被旁人死死抱住。你成了市上的“狠人”，也成了县吏名册上的“刺头”。', eff: { attrs: { weiji: 10, shengwang: 2 }, dev: 8, flags: ['hanyong'] }, to: '0-3' },
            { t: '掷剑于地，绕市而走', res: '剑也不要了，人也不要看了。笑声在你背后追了三条街。', eff: { attrs: { shengwang: -5, weiji: 3 }, dev: 3 }, to: '0-3' }
          ] },
        { id: '0-3', title: '仗剑何从',
          segs: ['这一年，天下乱了。会稽项氏起兵，渡江而来。', '你把兵书裹好，站在人生的第一个岔路口。'],
          options: [
            { t: '杖剑从戎，投项梁去', hist: true, res: '你背着剑，向渡口走去。乱世从不等犹豫的人。', eff: { attrs: { caixue: 2 }, dev: 0 }, to: 'NEXT' },
            { t: '守钓不问世事', res: '很多年后，淮阴人还记得城下有个钓了一辈子的老人。', eff: { dev: 0 }, to: { ending: 'E2' } }
          ] }
      ]
    },
    /* ---------- 第一章 ---------- */
    {
      id: 'c1', title: '第一章 ｜ 楚营郎中', sub: '前 208—前 206',
      summaryNotes: [
        '在楚营的两年，你把兵法想透了，也把"言不用"三个字尝够了。',
        '项羽的帐下不缺勇士，缺的是肯听他一句话的人——可惜你不是那个能被听的人。'
      ],
      intro: ['⟦项梁⟧渡淮，你杖剑从之。梁败死定陶，你归属⟦项羽⟧，为郎中。', '执戟立于霸王帐下的日子，看得最清楚的，是他的勇，和他的短。'],
      start: '1-1',
      events: [
        { id: '1-1', title: '从项梁',
          segs: ['军中你连姓名都没有。仗一仗一仗打过来，活着就是资历。', '又一场攻城战，云梯架上了城头。'],
          options: [
            { t: '陷阵先登', res: '你第一个翻上城头，肩上添了一道疤，名下添了一笔功。', eff: { attrs: { shengwang: 4, weiji: 3, caixue: 2 }, dev: 0 }, to: '1-2' },
            { t: '稳守辎重', res: '粮道寸土不失。没有人记得你，但全军都吃了你的粮。', eff: { attrs: { caifu: 3, shengwang: 1 }, dev: 0 }, to: '1-2' }
          ] },
        { id: '1-2', title: '数策于羽',
          segs: ['你写好的策论，一次次递上去。项羽看过，或者没看，总之没有下文。', '“以沛公为汉王，王巴蜀汉中——”巨鹿分封那日，你在帐外听见了这个安排。'],
          options: [
            { t: '数数献策，不言则不止', hist: true, res: '策论石沉大海。你把每一篇的草稿都留了下来——总有一处江山，识得这些字。', eff: { attrs: { caixue: 4, junxin: -2, shengwang: 3 }, dev: 0 }, to: '1-3' },
            { t: '闭口不言，冷眼观之', res: '你不再递了。他的败亡，在你心里一页页翻过去。', eff: { attrs: { weiji: -3, caixue: 2 }, dev: 3 }, to: '1-3' },
            { t: '当众争锋，直指其失', res: '一席话满帐皆惊。项羽笑了，笑里没有温度。', eff: { attrs: { shengwang: 5, weiji: 8 }, dev: 5 }, to: '1-3' }
          ] },
        { id: '1-3', title: '亡楚归汉',
          segs: ['汉王入蜀，烧绝栈道，示天下无还心。', '楚营的月，照不进你的前程了。走，还是留？'],
          options: [
            { t: '亡楚归汉', hist: true, res: '你把郎中的印绶解下，挂在帐前。夜色里，子午谷的路黑得很干净。', eff: { attrs: { weiji: 5 }, dev: 0 }, to: 'NEXT' },
            { t: '留楚不去', res: '你想：楚虽不我用，义不可负。很多年后垓下的火光里，没有人知道你是谁。', eff: { dev: 5 }, to: { ending: 'E3' } },
            { t: '再观形势', req: { shengwang: 20 }, res: '你又看了一年。看明白了：这座大营，终究不是读书人的江山。', eff: { attrs: { weiji: 3, junxin: 2 }, dev: 3 }, to: 'NEXT' }
          ] }
      ]
    },
    /* ---------- 第二章 节点N1 ---------- */
    {
      id: 'c2', title: '第二章 ｜ 亡楚归汉', sub: '前 206 · 历史节点',
      summaryNotes: [
        '从连敖到登坛，中间只隔着一个肯听你把话说完的人。',
        '斋戒三日，设坛具礼。明日之后，汉王的兵，姓韩。'
      ],
      intro: ['你亡入汉中，为连敖——一个管粮草收发的小官。', '从这里到登坛拜将，史书写起来只有三页。走起来，要过一道鬼门关。'],
      node: 'N1',
      mutations: [
        { if: { shengwang: 45 }, flag: 'hexianwen', note: '【节点异变】你的名声先你一步到了汉中——⟦萧何⟧已经在上书人的名单里见过你。' },
        { if: { junxinMax: 20 }, flag: 'wangqing', note: '【节点异变】你楚营执戟的出身被翻了出来——汉王看你，先带三分轻。' },
        { if: { weiji: 60 }, flag: 'zaofa', note: '【节点异变】军法吏已在核你的案卷——留给你的时间，比想的少。' },
        { if: { devMin: 40 }, flag: 'wutenggong', note: '【节点异变】⟦滕公⟧随驾在外，刑场上没有那个肯停下来听你说话的人。' }
      ],
      start: '2-1',
      events: [
        { id: '2-1', title: '坐法当斩',
          segs: ['为连敖，坐法当斩。同案的十三个人，已经依次斩完了。', '刀斧手走到你面前，喝问还有什么话说。'],
          options: [
            { t: '呼：“上不欲就天下乎？何为斩壮士！”', hist: true, res: '刀停在半空。监刑的滕公看了你很久：言貌不凡——放了。', eff: { attrs: { shengwang: 5 }, dev: 0, flags: ['tenggong'] }, to: '2-2' },
            { t: '仰天长叹，引颈就戮', res: '你闭眼的时候想的是：兵书还没写完，天下还没看完。——滕公的马车恰好到了。', eff: { attrs: { shengwang: 2 }, dev: 3, flags: ['tenggong'] },
              to: [ { if: { flag: 'wutenggong' }, to: { ending: 'E8' } }, { to: '2-2' } ] },
            { t: '贿赂刀斧手', req: { caifu: 8 }, res: '金子塞过去，绳子松了一扣。你活下来了，来路从此说不清。', eff: { attrs: { caifu: -8, weiji: 5 }, dev: 5, flags: ['xinghui'] }, to: '2-2' }
          ] },
        { id: '2-2', title: '治粟都尉',
          segs: ['滕公荐你于汉王，为治粟都尉。汉中的粮仓，从此归你调度。', '官不大，但足够你看清这个政权的筋骨。'],
          options: [
            { t: '整肃仓廪，井井有条', res: '三月之后，仓无陈粟，账无错字。汉王听人提起过你两次。', eff: { attrs: { caixue: 3, shengwang: 3, junxin: 3 }, dev: 0 }, to: '2-3' },
            { t: '敷衍度日，静待时机', res: '公务应付得过去就行。你的心思在地图上，不在账上。', eff: { attrs: { weiji: -3, junxin: -2 }, dev: 3 }, to: '2-3' }
          ] },
        { id: '2-3', title: '萧何数语',
          segs: ['相国⟦萧何⟧巡视粮政，你陪他核了三日账。灯下论政，他忽然问：天下事，君何以看？', '你知道，这扇门开得只有一次。'],
          options: [
            { t: '尽陈兵略，言不隔夜', hist: true, res: '从秦制之弊说到楚王之短，从巴蜀之险说到三秦之怨。萧何离席长揖：国士无双。', eff: { attrs: { caixue: 5, junxin: 5 }, dev: 0, flags: ['xiaohe'], ach: 'xiaohe' }, to: '2-4' },
            { t: '藏拙不言，点到为止', res: '萧何笑了笑，没再追问。门开了一条缝，又合上了。', eff: { attrs: { junxin: -3, weiji: -3 }, dev: 3 }, to: '2-4' },
            { t: '以退为进，扬言欲去', res: '“此地终非久居。”你把话说给该听见的人听。赌赢了是登坛，赌输了是路。', eff: { attrs: { junxin: -5, shengwang: 3 }, dev: 5, flags: ['yangqu'] }, to: '2-4' }
          ] },
        { id: '2-4', title: '萧何月下',
          segs: ['你留书一封，走了。当夜，萧何没有禀报，单骑直追。', '月光下，马蹄声在你身后响了三十里：“将军留步——汉王失天下无日矣！”'],
          options: [
            { t: '归而受命', hist: true, res: '萧何对汉王说：“必欲争天下，非信无所与计事者。”三日后，汉王斋戒设坛。', eff: { attrs: { junxin: 5 }, dev: 0, flags: ['xiaohe-gui'] }, to: '2-5' },
            { t: '执意要走', res: '“此处不用我，何不走？”萧何又劝了一夜。', eff: { attrs: { junxin: -8 }, dev: 3, flags: ['zhui2'] },
              to: [ { if: { flag: 'zhui2' }, to: { ending: 'E2' } }, { to: '2-4' } ] }
          ] },
        { id: '2-5', title: '登坛拜将', key: true,
          segs: ['良日斋戒，设坛场，具礼。汉王亲授大将印绶。', '拜将毕，汉王问：“将军何以教寡人计策？”满营文武，都在等你的第一句。'],
          options: [
            { t: '陈“汉中对”，还定三秦之策', hist: true, req: { caixue: 50 }, res: '“项王喑恶叱咤，千人皆废，匹夫之勇也；待人恭敬慈爱，妇人之仁也。秦卒怨其主久矣——还定三秦，可传檄而定。”汉王大喜：得信晚也。', eff: { attrs: { junxin: 15, quanshi: 10, shengwang: 8, caixue: 2 }, dev: 0, flags: ['hanzhongdui'], merit: '汉中', ach: 'dengtan' }, to: 'NEXT' },
            { t: '答以守成之策，稳扎稳打', res: '话说得稳妥，也平庸。汉王礼貌地点头，眼里的光淡了些。', eff: { attrs: { junxin: -5, quanshi: 3 }, dev: 5 }, to: 'NEXT' }
          ] }
      ]
    },
    /* ---------- 第三章 ---------- */
    {
      id: 'c3', title: '第三章 ｜ 还定三秦', sub: '前 206—前 205',
      summaryNotes: [
        '三秦传檄而定。史书说"八月，汉王举兵东出"——四个字背后，是你画了三年的地图。',
        '彭城一败，汉王的五十六万，输给项羽的三万。败军之际，方知谁是砥柱。'
      ],
      intro: ['大将印绶在手，第一道军令却出乎所有人意料：修路。', '樊哙在⟦栈道⟧上日日敲石头，关中都在笑——而你的兵，已经悄悄离了南郑。'],
      start: '3-1',
      events: [
        { id: '3-1', title: '明修栈道，暗度陈仓',
          segs: ['明修栈道，⟦暗度陈仓⟧。当章邯在陈仓城头看见你的军旗时，⟦三秦⟧的天就变了。', '这一仗，是所有人命运的转折——包括你自己的。'],
          options: [
            { t: '举兵东出，传檄而定三秦', hist: true, res: '章邯溃走，塞王翟王相继而降。关中父老章食壶浆——他们在秦法下等这一天，等了太久。', eff: { attrs: { quanshi: 8, shengwang: 8, junxin: 8 }, dev: 0, merit: '三秦', ach: 'chencang' },
              to: [ { if: { caixue: 55 }, to: '3-2' }, { to: '3-1b' } ] },
            { t: '兵分两路，正奇相济', res: '一路修栈道，一路出散关。慢是慢些，稳是稳些。', eff: { attrs: { quanshi: 6, shengwang: 4, weiji: 5 }, dev: 5 }, to: '3-2' }
          ] },
        { id: '3-1b', title: '陈仓苦战',
          segs: ['陈仓城坚，章邯死守。你的兵在城下磨了半个月，伤亡渐重。', '军中有言：大将之名，言过其实。'],
          options: [
            { t: '血战拔城', res: '城破之日，你站在陈仓城头，风把血腥味吹散了三里。代价付过了，教训也记住了。', eff: { attrs: { weiji: 15, quanshi: 5 }, dev: 0 }, to: '3-2' },
            { t: '退保汉中，再图后举', res: '退兵的军令很难下，但你下了。章邯没有追——他也不敢赌。', eff: { attrs: { quanshi: -8, junxin: -5 }, dev: 3 }, to: '3-2' }
          ] },
        { id: '3-2', title: '彭城之败',
          segs: ['汉王合五十六万之众入彭城，被项羽三万精骑一击而溃。', '睢水为之不流。溃兵像决口的河，漫山奔逃。'],
          options: [
            { t: '收拢溃兵，与上会于荥阳', hist: true, res: '你一路收兵，一路整队，到荥阳时交出去的是一支还能打仗的军队。汉王拉着你的手，半天没说出话。', eff: { attrs: { quanshi: 5, junxin: 8, shengwang: 3 }, dev: 0 }, to: '3-3' },
            { t: '自守成皋，稳住阵脚', res: '你按兵成皋，楚军三攻不下。战线稳住了，功劳簿上却没有你的名字。', eff: { attrs: { quanshi: 3, junxin: -3 }, dev: 3 }, to: '3-3' },
            { t: '趁乱扩军，自壮其势', res: '溃兵是最好的兵源。你的军力涨了一截，汉王看你的眼神，也多了一层东西。', eff: { attrs: { quanshi: 8, weiji: 5 }, dev: 5, zg: 8 }, to: '3-3' }
          ] },
        { id: '3-3', title: '破魏之役',
          segs: ['魏王豹反，塞住蒲坂渡口。你把大军摆在渡口对面，日日操练。', '真正的渡军，在百里之外的上游——⟦木罂缶⟧，缚木为筏。'],
          options: [
            { t: '木罂缶渡河，袭安邑', hist: true, res: '魏军还盯着渡口，你的兵已经进了安邑城。魏王豹就擒之日，河东父老箪食相迎。', eff: { attrs: { quanshi: 6, shengwang: 6, junxin: 5 }, dev: 0, merit: '破魏' },
              to: [ { if: { caixue: 55 }, to: 'NEXT' }, { to: '3-3' } ] },
            { t: '正面强攻，以力破之', res: '尸山血海打下渡口。仗是赢了，兵书上说这种仗叫"下策"。', eff: { attrs: { quanshi: 4, weiji: 8, shengwang: -3 }, dev: 5 }, to: 'NEXT' }
          ] }
      ]
    },
    /* ---------- 第四章 节点N2 ---------- */
    {
      id: 'c4', title: '第四章 ｜ 背水·潍水', sub: '前 205—前 203 · 历史节点',
      summaryNotes: [
        '井陉口的早晨，三万对二十万。兵书被你翻烂的那一页，今天要用上了。',
        '潍水的水流很急。急到足够把龙且的二十万，送进你的口袋。'
      ],
      intro: ['破魏之后，兵锋东指：赵歇、陈馀，二十万大军守在⟦井陉口⟧。', '你手里只有三万。所有人都在等你绕路，你却命令：继续前进。'],
      node: 'N2',
      mutations: [
        { if: { shengwang: 60 }, flag: 'qingdi', note: '【节点异变】你的名声太盛，陈馀反而不敢守——赵军倾巢出垒，要与你野战。' },
        { if: { devMin: 46 }, flag: 'zuochece', note: '【节点异变】历史的走向偏了——这一回，陈馀听了⟦李左车⟧的策。' }
      ],
      start: '4-1',
      events: [
        { id: '4-1', title: '井陉口', key: true,
          segs: ['夜半，你遣两千轻骑，人持一赤帜，伏于赵营侧。', '天明，你令全军：背水而阵。诸将愕然——兵书说，右倍山陵，前左水泽。', '你说：兵书还说，陷之死地而后生，置之亡地而后存。'],
          options: [
            { t: '背水一战，大破赵军', hist: true, res: '赵军争功出垒，汉军殊死而战。两千赤帜拔营易帜之时，二十万人的阵脚，在一瞬间散了。', eff: { attrs: { quanshi: 8, shengwang: 10, junxin: 5 }, dev: 0, merit: '破赵', ach: 'beishui' },
              to: [ { if: { caixue: 60 }, to: '4-2' }, { to: '4-1b' } ] },
            { t: '据险缓图，不与争锋', res: '你扎下营盘，与赵军对耗。耗得住的是军心，耗不住的是粮道。', eff: { attrs: { quanshi: 4, weiji: 5 }, dev: 5 }, to: '4-2' }
          ] },
        { id: '4-1b', title: '背水覆军',
          segs: ['背水之阵没有激出死战，先溃的是左翼。赵军的鼓声震得河水都在抖。', '你的第一次大败，来得比想象中快。'],
          options: [
            { t: '收残兵再战', req: { shengwang: 45 }, res: '你把溃兵重新捏成军队。败军之将，卷土重来——这比打赢难十倍。', eff: { attrs: { quanshi: -10, weiji: 10 }, dev: 0 }, to: '4-2' },
            { t: '单骑而逃', res: '马识归途，人不识。', eff: { dev: 0 }, to: { ending: 'E8', variant: 'weishui' } }
          ] },
        { id: '4-2', title: '李左车',
          segs: ['破赵之后，你悬千金之赏，生得广武君⟦李左车⟧。', '全军以为你要斩他，你却解其缚，东向坐，以师事之。'],
          options: [
            { t: '师事之，问北略', hist: true, res: '“败军之将，何足言勇？”左车被你的诚意打动，为你画策：先声后实，传檄燕齐。', eff: { attrs: { caixue: 5, shengwang: 5 }, dev: 0, flags: ['zuoche'], hist: 10, ach: 'zuoche' }, to: '4-3' },
            { t: '斩之示众', res: '一颗人头落地，换得三军一凛。也换得天下谋士，从此绕着你走。', eff: { attrs: { shengwang: -8, weiji: 5 }, dev: 5, hist: -10 }, to: '4-3' },
            { t: '释而归之', res: '你放他走了。他回赵地后逢人便说：韩将军，国士也。', eff: { attrs: { shengwang: 3 }, dev: 3 }, to: '4-3' }
          ] },
        { id: '4-3', title: '潍水龙且',
          segs: ['齐楚合兵二十万，楚将⟦龙且⟧率之救齐，与你夹潍水而阵。', '你令士卒以万囊盛沙，夜壅上流。天明，你引军半渡而击，佯败诱之。'],
          options: [
            { t: '半渡而击，水淹楚军', hist: true, res: '龙且追至中流，你决开沙囊——潍水暴涨，楚军大半不得渡。龙且授首，齐王广就擒。', eff: { attrs: { quanshi: 8, shengwang: 10, junxin: 5 }, dev: 0, merit: '破齐', flags: ['poqi'], ach: 'longju' },
              to: [ { if: { caixue: 60 }, to: 'NEXT' }, { to: '4-3b' } ] },
            { t: '深沟高垒，持久疲敌', res: '你不打。龙且骂阵三月，骂不动了，粮尽了，自己乱了。', eff: { attrs: { quanshi: 4, junxin: -3, weiji: 3 }, dev: 5, flags: ['poqi'] }, to: 'NEXT' }
          ] },
        { id: '4-3b', title: '潍水胶着',
          segs: ['沙囊决早了半刻，大水只冲走楚军前队。龙且缩回对岸，两军隔河僵住。', '齐地的冬天，粮道拉得太长了。'],
          options: [
            { t: '夜袭连营', req: { shengwang: 55 }, res: '三更火起，楚军自相惊扰。龙且退三十里，齐地的大门，还是被你撞开了。', eff: { attrs: { quanshi: 5, weiji: 8 }, dev: 0, flags: ['poqi'] }, to: 'NEXT' },
            { t: '请汉王增兵', res: '援兵到了，仗打赢了，请兵的奏报也永远留在了汉王的案头。', eff: { attrs: { junxin: -8, quanshi: 3 }, dev: 3, flags: ['poqi'] }, to: 'NEXT' }
          ] }
      ]
    },
    /* ---------- 第五章 节点N3 ---------- */
    {
      id: 'c5', title: '第五章 ｜ 齐王', sub: '前 203 · 历史节点 · 全剧本枢纽',
      summaryNotes: [
        '封王的诏书到的那天，你站在齐王宫的台阶上，看见了汉王眼睛里所有的明天。'
      ],
      intro: ['齐地初定，七十馀城尽下。你遣使上书：齐伪诈多变，愿为假王以镇之。', '汉王览书，勃然大怒。使者的生命，悬在张良陈平的一脚暗踢上。'],
      node: 'N3',
      start: '5-1',
      events: [
        { id: '5-1', title: '请封假王', key: true,
          segs: ['“大丈夫定诸侯，即为真王耳，何以假为！”——汉王的诏书这样写。', '册封的使者南来之日，齐地百姓夹道。你从这一天起，不只是将军了。'],
          options: [
            { t: '静候汉王处分', hist: true, res: '你从假王成了真齐王。谢恩的表章写得恭谨，汉王的猜忌却从这一天开始记账。', eff: { attrs: { quanshi: 12, junxin: 5 }, dev: 0, merit: '齐王', ach: 'qiwang', zg: 15 }, to: '5-2' },
            { t: '上书谢罪，自贬一级', res: '你主动把"王"字往外推了一步。汉王准了，赏你温良，也记住了你的退让。', eff: { attrs: { junxin: 8, quanshi: -5 }, dev: 5, zg: -5 }, to: '5-2' },
            { t: '再遣使催封', res: '第二封催封的书信送出，齐地弹冠，汉廷侧目。', eff: { attrs: { quanshi: 5, junxin: -8 }, dev: 5, zg: 20 }, to: '5-2' }
          ] },
        { id: '5-2', title: '垓下之会',
          segs: ['前202年，你会诸侯兵于⟦垓下⟧，围项羽于乌江之侧。', '三十万大军，十面埋伏。这是你一生中最大的一盘棋——项羽是棋子，天下是棋盘。'],
          options: [
            { t: '独当一面，十面埋伏', hist: true, res: '四面楚歌起时，霸王别姬，自刎乌江。六年的楚汉之争，在你的阵前落幕。', eff: { attrs: { shengwang: 10, quanshi: 4 }, dev: 0, merit: '垓下' }, to: '5-3' },
            { t: '让首功于诸将', res: '你把中军大帐让给了灌婴。庆功宴上人人夸你大度，只有你知道自己在做什么。', eff: { attrs: { shengwang: -5, junxin: 8 }, dev: 5, zg: -8 }, to: '5-3' }
          ] },
        { id: '5-3', title: '蒯通之对', key: true,
          segs: ['齐人⟦蒯通⟧来见你，相你之面："贵不可言。"', '“当今之世，两主之命县于足下。足下为汉则汉胜，为楚则楚胜——莫若三分天下，鼎足而居。”', '帐中烛火，烧到了尽头。这一句话，你要用一生来答。'],
          options: [
            { t: '谢曰：“汉王遇我厚，岂可背义！”', hist: true, res: '“汉王解衣衣我，推食食我——向利而背义，吾不忍也。”蒯通长叹而去，出门时说了句什么，你没有听清。', eff: { attrs: { junxin: 5 }, dev: 0, zg: -5, flags: ['conghan'] }, to: 'NEXT' },
            { t: '听蒯通，据齐三分', res: '“先生之言，深中我心。”当夜，临淄的城头换了备战的灯笼。', eff: { attrs: { weiji: 30 }, dev: 40, ach: 'kuaitong' },
              to: [ { if: { quanshi: 70, zgMax: 59, devMin: 46 }, to: { ending: 'E6' } }, { to: { ending: 'E4' } } ] },
            { t: '从汉，但请解兵权归老', res: '“臣愿还兵符，归老淮阴——功已成，名已就，所求者，全此身耳。”', eff: { attrs: { quanshi: -15, weiji: -10 }, dev: 15 },
              to: [ { if: { shengwang: 50 }, to: { ending: 'E5' } }, { to: 'NEXT' } ] },
            { t: '阳从阴蓄，徐图其后', req: { caixue: 65 }, res: '你谢了蒯通，也谢了汉王。两封回信措辞都极恭顺——只有你自己知道，哪一封是真的。', eff: { attrs: { weiji: 15 }, dev: 15, flags: ['xuli'] }, to: 'NEXT' }
          ] }
      ]
    },
    /* ---------- 第六章 ---------- */
    {
      id: 'c6', title: '第六章 ｜ 云梦与钟室', sub: '前 202—前 196（从汉线）',
      summaryNotes: [
        '史书行到此处，只剩最后一页。云梦的云，长乐的钟，都在这一页里。'
      ],
      intro: ['垓下既毕，汉王徙你为楚王，都下邳。', '你回到淮阴：赐漂母千金，召辱己之少年为中尉——恩怨两讫，乡人称颂。'],
      start: '6-1',
      events: [
        { id: '6-1', title: '徙楚王',
          segs: ['项王已死，你的兵权也被一并收走大半。楚王的王冠很好，只是不再染兵。', '衣锦还乡那日，下邳万人空巷。'],
          options: [
            { t: '报德雪怨并施', hist: true, res: '“一饭千金”，漂母受之；“胯下之辱”，少年拜尉。恩怨皆了，史官把这两笔都记下了。', eff: { attrs: { shengwang: 8 }, dev: 0, hist: 15 }, to: '6-2' },
            { t: '薄赏旧怨，不置一词', res: '你什么也没赏，什么也没罚。乡人看不懂你，正如他们从来也没看懂过。', eff: { attrs: { shengwang: -3 }, dev: 3, hist: -5 }, to: '6-2' }
          ] },
        { id: '6-2', title: '钟离眜来投',
          segs: ['楚旧将⟦钟离眜⟧，帝之宿怨，亡命来归。他知道收留他意味着什么，你也知道。', '门外，朝廷缉拿他的海捕文书已经到了下邳。'],
          options: [
            { t: '收而庇之', hist: true, res: '你把他藏进了王府深处。义气你全了，把柄你也递出去了。', eff: { attrs: { shengwang: 5 }, dev: 0, flags: ['zhongli'], zg: 10 }, to: '6-3' },
            { t: '拒而不纳', res: '钟离眜看着你，惨笑而去。三日后，他自刭于客舍。', eff: { attrs: { shengwang: -3 }, dev: 3, zg: -5 }, to: '6-3' },
            { t: '缚而献之', res: '使者押着钟离眜北去时，你站在阶上看了很久。义与利之间，你选了后者——史书会替你记下。', eff: { attrs: { junxin: 5, shengwang: -8 }, dev: 5, hist: -10 }, to: '6-3' }
          ] },
        { id: '6-3', title: '伪游云梦',
          segs: ['帝伪游⟦云梦⟧，会诸侯于陈。去，是局；不去，也是局。', '钟离眜的头颅，此刻就函在你的车里。'],
          options: [
            { t: '持钟离眜首级往谒', hist: true, res: '你捧着函首入帐，武士一拥而上。绳缚加身时你说：“果若人言：狡兔死，走狗烹。”', eff: { attrs: { shengwang: -5 }, dev: 0 },
              to: [ { if: { zgMax: 69 }, to: '6-4' }, { to: { ending: 'E8', variant: 'yunmeng' } } ] },
            { t: '发兵拒捕', req: { quanshi: 60 }, res: '你的兵还没出下邳，周勃的援军已经封锁了泗水。', eff: { attrs: { weiji: 30 }, dev: 30 }, to: { ending: 'E8', variant: 'yunmeng' } },
            { t: '称病不往', res: '第三道催行的诏书到时，你知道装病救不了你了。', eff: { attrs: { junxin: -10, weiji: 10 }, dev: 5, zg: 10 }, to: '6-4' }
          ] },
        { id: '6-4', title: '长安怏怏', key: true,
          segs: ['你被赦了死罪，降为淮阴侯，留居长安。居常怏怏，羞与绛、灌等列。', '⟦陈豨⟧拜钜鹿守，临行来辞。屏退左右，你们谈了很久。'],
          options: [
            { t: '勉其反，约为内应', hist: true, res: '“公之所居，天下精兵处也；公为陛下信臣——人言公反，陛下必不信；再三言，乃怒，必自将而击之。吾为公从中起，天下可图也。”', eff: { attrs: { weiji: 15 }, dev: 10, flags: ['chenxi'], zg: 10 },
              to: [ { if: { flag: 'xuli', quanshi: 75, weijiMax: 79 }, to: { ending: 'E7' } }, { to: '6-5' } ] },
            { t: '戒其忠慎，勿生异志', res: '陈豨愕然良久，拜谢而去。你送他到门口，忽然觉得长安的风小了一点。', eff: { attrs: { shengwang: 3, junxin: 3 }, dev: 3, hist: 5 }, to: '6-5' }
          ] },
        { id: '6-5', title: '钟室',
          segs: ['陈豨反于代，帝自将击之。吕后与⟦萧何⟧以计绐你：豨已死，群臣皆贺。', '长乐宫的钟室里，烛火通明。你一生计算的终点，是一间没有窗的屋子。'],
          options: [
            { t: '入贺', hist: true, res: '“吾悔不用蒯通之计，乃为儿女子所诈，岂非天哉！”——钟室之门，在你身后阖上。', eff: { dev: 0 },
              to: [ { if: { flag: 'xuli' }, to: { ending: 'E8', variant: 'mouxie' } }, { to: { ending: 'E1' } } ] },
            { t: '称疾不贺', res: '你赌她不敢擅杀功臣——赌错了。', eff: { attrs: { weiji: 15 }, dev: 5 },
              to: [ { if: { weijiMax: 84 }, to: { ending: 'E1' } }, { to: { ending: 'E8', variant: 'mouxie' } } ] }
          ] }
      ]
    }
  ];

  /* ============ 章末历史修正事件池（韩信语境：汉廷/吕后/诸将/旧部，凶手动机预兆齐备） ============ */
  var CORRECTIONS = [
    { minDev: 21, maxDev: 45, chance: 0.3, title: '修正 ｜ 军中流言',
      segs: ['【历史修正】军营里开始有人编排你：胯下之夫，也配为大将？',
             '你改动的每一步，都有人眼红。旧账不怕没人翻，只怕没人记得。'],
      eff: { attrs: { shengwang: -5 }, dev: 0 } },
    { minDev: 21, maxDev: 45, chance: 0.3, title: '修正 ｜ 粮道被劾',
      segs: ['【历史修正】御史参了一本：你的军需出入，有三笔对不上。虽不致命，却灰头土脸了几日。',
             '管过粮仓的人，永远洗不净手上的米香。'],
      eff: { attrs: { weiji: 4, junxin: -3 }, dev: 0 } },
    { minDev: 21, maxDev: 45, chance: 0.3, title: '修正 ｜ 旧部离心',
      segs: ['【历史修正】一名楚营旧部留书出走：“将军非复淮阴之将军矣。”',
             '你改道的每一步，旧日同袍都在重新打量你。'],
      eff: { attrs: { shengwang: -4, weiji: 2 }, dev: 0 } },
    { minDev: 46, maxDev: 70, chance: 1, title: '修正 ｜ 诸将联合',
      segs: ['【历史修正】绛侯、颍阴侯联袂过府，“叙旧”叙到三更。他们看你的眼神，像看一座迟早要平的山。',
             '你改动的封赏次序，动的都是他们的位置。'],
      eff: { attrs: { weiji: 12, shengwang: -5 }, dev: 0 } },
    { minDev: 46, maxDev: 70, chance: 1, title: '修正 ｜ 君王夜问',
      segs: ['【历史修正】汉王夜召张良入宫，屏退左右。次日看你的赏赐薄了一档——他在重新称你的分量。',
             '【刘邦疑心】那杆秤，开始往不利于你的一侧倾斜。'],
      eff: { attrs: { junxin: -6 }, zg: 6, dev: 0 } },
    { minDev: 46, maxDev: 70, chance: 1, title: '修正 ｜ 旧敌反噬',
      segs: ['【历史修正】章邯旧部在关中复炽，打着“诛韩”的旗号劫你的粮队。',
             '你改写的那场败仗，败军之将的后人还记得。'],
      eff: { attrs: { weiji: 10, caifu: -6 }, dev: 0 } },
    { minDev: 71, maxDev: 100, chance: 1, title: '修正 ｜ 天命反噬',
      segs: ['【历史修正】你改得太多：军报、谗言、密奏雪片般飞向长安——有人要用最古老的方式，让历史回到正轨。',
             '天下的棋盘已经容不下一个比棋手更大的棋子。'],
      eff: { attrs: { weiji: 18, junxin: -8 }, dev: 0 } },
    { minDev: 71, maxDev: 100, chance: 1, title: '修正 ｜ 吕后之目',
      segs: ['【历史修正】长乐宫的吕后，开始亲自过问你的起居注。她看你的方式，像看一份迟早要批的死刑奏章。',
             '【刘邦疑心】被更早、更冷的眼睛接了过去。'],
      eff: { attrs: { weiji: 15 }, zg: 8, dev: 0 } },
    { minDev: 71, maxDev: 100, chance: 1, title: '修正 ｜ 使者频繁',
      segs: ['【历史修正】朝廷的使者一月三至，名为慰问，实为检校。你的王府，已经是一座透明的城。',
             '你改动的历史越大，盯着你的眼睛就越多。'],
      eff: { attrs: { weiji: 14, shengwang: -6 }, dev: 0 } }
  ];

  /* ============ 成就（GDD 5.6：每剧本 8–12 个） ============ */
  var ACHIEVEMENTS = {
    kuaxia: '胯下之忍',   // 俯出胯下，忍人所不能忍
    piaomu: '一饭之恩',   // 受漂母之饭而铭记之
    xiaohe: '国士无双',   // 萧何月下被追回
    dengtan: '登坛拜将',  // 陈汉中对，拜大将
    chencang: '暗度陈仓', // 还定三秦
    beishui: '背水一战',  // 井陉口破赵二十万
    zuoche: '师事左车',   // 解缚李左车，东向坐而师之
    longju: '潍水龙且',   // 沙囊壅水，半渡击楚
    qiwang: '齐王',       // 请封而得真王
    kuaitong: '蒯通之计', // 听蒯通，据齐三分
    zhongshi: '钟室之斩', // 达成史实结局 E1
    xuedao: '学道全身'    // 达成 E5 解甲归隐
  };

  /* ============ 复盘关键节点 ============ */
  var KEY_NODE_NAMES = { '2-5': '登坛拜将', '4-1': '背水一战', '5-1': '请封齐王', '5-3': '蒯通之对', '6-4': '陈豨之辞' };

  /* ============ 随机际遇事件池（40% 概率、每章至多 2 次、章内不重复；to 固定 'RETURN'） ============ */
  var RANDOM_EVENTS = [
    { id: 'R-1', title: '漂母旧事', chapters: [0, 1],
      segs: ['有淮阴同乡路过，捎来漂母的口信：饭吃不吃得好，无妨，人要活出个样子。'],
      options: [
        { t: '托他捎回钱帛', res: '你把半月的粮饷塞进同乡行囊。恩可以不报，不能不记。', eff: { attrs: { caifu: -3, shengwang: 2 }, dev: 0 }, to: 'RETURN' },
        { t: '只回一句“记下了”', res: '话说出口你先沉默了。有些债，只能先欠着。', eff: { attrs: { weiji: -1 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-2', title: '军中较剑', chapters: [1, 3],
      segs: ['营中几个悍卒听闻你带剑，约你较技。围观者甚众。'],
      options: [
        { t: '下场比试', res: '三招之内见分晓。从此营中再没人拿你的出身说事。', eff: { attrs: { shengwang: 3, weiji: 2 }, dev: 0 }, to: 'RETURN' },
        { t: '笑而不应', res: '你拱手绕开。他们说你怯，你知道没必要。', eff: { attrs: { shengwang: -2, weiji: -2 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-3', title: '萧何问计', chapters: [2, 4], cond: { flag: 'xiaohe' },
      segs: ['相国深夜过访，屏退左右，问你对当下时局的看法。', '烛花爆了两声。这种夜谈，从来没有第二个人知道。'],
      options: [
        { t: '和盘托出', res: '你们对着地图谈到四更。萧何走时，把你的手按了两按。', eff: { attrs: { junxin: 3, caixue: 2 }, dev: 0 }, to: 'RETURN' },
        { t: '点到为止', res: '话说三分留七分。萧何笑了笑，也不深问。', eff: { attrs: { weiji: -2 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-4', title: '门客来投', chapters: [2, 6],
      segs: ['一个落魄的读书人站在你门前三天了，求为门客。', '仆从问他有何所长，他说：无一长，唯不事二主。'],
      options: [
        { t: '收为门客', res: '你收下了他。本事且看日后，这份心气你倒熟悉。', eff: { attrs: { caifu: -4, shengwang: 3 }, dev: 0 }, to: 'RETURN' },
        { t: '让仆从打发走', res: '读书人长揖到地，走进人流。乱世里，这样的背影太多了。', eff: { dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-5', title: '樊哙挑衅', chapters: [2, 5],
      segs: ['舞阳侯樊哙当众发难：“胯下之夫，也配与吾等同列？”满帐都在看你。'],
      options: [
        { t: '笑而受之', res: '你给他斟了一爵酒。樊哙愣了半晌，仰头干了。', eff: { attrs: { weiji: -3, shengwang: 2 }, dev: 0 }, to: 'RETURN' },
        { t: '当庭折之', res: '你历数三场战役，问樊哙打下来几场。帐里静得可怕。', eff: { attrs: { shengwang: 3, weiji: 6 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-6', title: '张良夜访', chapters: [3, 6], cond: { junxin: 40 },
      segs: ['留侯张良携一壶酒来访，不谈军，不谈政，只谈山中何所有。'],
      options: [
        { t: '与他坐而论道', res: '子房临去时说了一句：功成身退，天之道也。你记下了。', eff: { attrs: { weiji: -3, caixue: 2 }, dev: 0 }, to: 'RETURN' },
        { t: '只叙寒温，不谈机要', res: '张良看了看天色，笑着告辞。聪明人的试探，你装作没听懂。', eff: { attrs: { weiji: -1 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-7', title: '旧卒求恤', chapters: [1, 6],
      segs: ['一个断腿的老卒拦在营外：当年与你同伍，如今无以为生。'],
      options: [
        { t: '厚恤之', res: '老卒磕头时，围观的士卒都看着。次日，营中多了几分敬意。', eff: { attrs: { caifu: -4, shengwang: 3 }, dev: 0 }, to: 'RETURN' },
        { t: '按例给遣', res: '照章程给了遣散。老卒没说什么，你的心里却空了一块。', eff: { attrs: { caifu: -2, shengwang: -2 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-8', title: '夜读兵书', chapters: [0, 6],
      segs: ['更鼓三声，案上的《司马法》还剩最后一卷。'],
      options: [
        { t: '挑灯读完', res: '天边泛白时你搁下卷。眼里是血丝，心里是山河。', eff: { attrs: { caixue: 4, weiji: 2 }, dev: 0 }, to: 'RETURN' },
        { t: '熄灯睡觉', res: '你吹灭蜡烛。书明天还在，命只有一条。', eff: { attrs: { weiji: -2 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-9', title: '汉王观阵', chapters: [3, 5], cond: { junxin: 45 },
      segs: ['汉王忽然亲临校场，要看你练兵。满营的目光都聚过来。'],
      options: [
        { t: '倾囊展示', res: '阵法开合，汉王抚掌三次。他走后，你的名字在营中又重了一分。', eff: { attrs: { junxin: 4, shengwang: 2 }, dev: 0 }, to: 'RETURN' },
        { t: '示以寻常操典', res: '你藏了七分本事。汉王看了半场就走了，神色淡淡。', eff: { attrs: { weiji: -2, junxin: -2 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-10', title: '齐地豪强', chapters: [4, 6], cond: { quanshi: 30 },
      segs: ['齐地几户大族联名求见，献上厚礼，话里话外都在试探你的意思。'],
      options: [
        { t: '收礼结交', res: '礼物入库，交情入账。齐地的水，你算蹚明白了。', eff: { attrs: { caifu: 6, weiji: 4 }, dev: 0 }, to: 'RETURN' },
        { t: '原礼奉还', res: '豪强们的脸色变了变，躬身退下。从此齐地看你，敬少了，计多了。', eff: { attrs: { shengwang: 3, weiji: 2 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-11', title: '吕后召见', chapters: [5, 6], cond: { weiji: 40 },
      segs: ['长乐宫遣人来请，说吕后设小宴，独请你一人。', '使者笑得客气，眼里没有笑意。'],
      options: [
        { t: '赴宴，应对如仪', res: '席间她问了三次兵权，你答了三次家务。散席时后背是凉的。', eff: { attrs: { weiji: -3, junxin: 2 }, dev: 0 }, to: 'RETURN' },
        { t: '称疾推辞', res: '你称病不去。长乐宫的回话只有四个字：好生将养。', eff: { attrs: { weiji: 5, junxin: -3 }, dev: 0 }, to: 'RETURN' }
      ] },
    { id: 'R-12', title: '乌江亭长', chapters: [5, 6],
      segs: ['乌江亭长携一坛酒来谢：项王自刎那日，他就在渡口。他说，天下人都在传将军的名字。'],
      options: [
        { t: '受酒长谈', res: '你听他把垓下那夜讲了三遍。有些胜利，越听越不像胜利。', eff: { attrs: { shengwang: 3, weiji: -2 }, dev: 0 }, to: 'RETURN' },
        { t: '谢而不受', res: '你推了那坛酒。亭长走后，你在地图前坐了很久。', eff: { attrs: { weiji: -1 }, dev: 0 }, to: 'RETURN' }
      ] }
  ];

  /* ============ 危机高值事件（GDD 4.1） ============ */
  var CRISIS_EVENTS = {
    plots: [
      { id: 'C-1', title: '军中被参',
        segs: ['有裨将联名上书，参你"治军严苛，滥赏亲旧"。', '预兆早有——前日犒赏下来，偏袒的名单被人抄了一份。', '你动了旧部的位置，他们便动你的名声。'],
        options: [
          { t: '逐条自辩，并主动让赏', res: '奏报上去，汉王朱笔一批"知道了"。让出去的赏，换回来的命。', eff: { attrs: { caifu: -6, weiji: -8, junxin: 2 }, dev: 0 }, to: 'RETURN' },
          { t: '置之不理', res: '你不屑分辩。参本没有停，名目倒是一月一换。', eff: { attrs: { weiji: 6 }, dev: 0 }, to: 'RETURN' }
        ] },
      { id: 'C-2', title: '汉廷削封',
        segs: ['朝廷下诏：诸侯王食邑，核减三成。名义上是普恩，实际上只削了你一家。', '诏书的措辞客气得像刀鞘。'],
        options: [
          { t: '奉诏谢恩', res: '你接了诏，谢了恩。让出去的食邑，是给长安看的姿态。', eff: { attrs: { caifu: -8, weiji: -6, junxin: 3 }, dev: 0 }, to: 'RETURN' },
          { t: '上书诉争', res: '诉争的表章石沉大海。第二道诏书来时，又多削了一成。', eff: { attrs: { weiji: 8, junxin: -4 }, dev: 0 }, to: 'RETURN' }
        ] },
      { id: 'C-3', title: '旧敌暗箭',
        segs: ['夜里，一支冷箭钉在你府门的柱子上，无羽，无记。', '侍卫追出去，只抓到一把秦制弩机——章邯旧部的手法。'],
        options: [
          { t: '加卫闭门，暗中查访', res: '府邸守得铁桶一般。箭再没来——至少你看不见了。', eff: { attrs: { caifu: -6, weiji: -8 }, dev: 0 }, to: 'RETURN' },
          { t: '悬箭于门，示无所惧', res: '你把箭留在柱上，照常出入。暗中的人更恨了，看客却服了。', eff: { attrs: { shengwang: 3, weiji: 5 }, dev: 0 }, to: 'RETURN' }
        ] }
    ],
    death: { id: 'C-DEATH', title: '杀机已至',
      segs: ['廷尉府的缇骑包围了你的府邸——这一次，奉的是明诏。', '亲信连夜来报：钟室的地砖，刚用水洗过。', '你还有最后一次挣扎的机会。'],
      options: [
        { t: '散尽家财，求得一线', req: { caifu: 30 }, res: '万金散去，诏书的措辞软了几分。死罪可免——这一次。', eff: { attrs: { caifu: -30, weiji: -25 }, dev: 0 }, to: 'RETURN' },
        { t: '上书自辩', req: { caixue: 60 }, res: '你把半生功劳与委屈写成一封书。书达御前，换来几日死缓。', eff: { attrs: { weiji: -15, junxin: -5 }, dev: 0 }, to: 'RETURN' },
        { t: '坐以待毙', res: '你搁下笔，整衣危坐。', eff: { attrs: { weiji: 15 }, dev: 0 }, to: 'RETURN' }
      ] }
  };

  /* ============ 主动行动（行动卡回合制；通用 6 + 章定制 6，每章池恒 12，共 48） ============
   * 数值口径：单项 ≤±8、zg ≤±5、不写 flags/hist/merit、dev 恒 0。
   * chapters:[起,止]：0 淮阴 / 1 楚营 / 2 汉中 / 3 三秦 / 4 赵齐 / 5 齐王 / 6 楚与长安。 */
  var ACTIONS = [
    /* ---- 通用行动（全章可用） ---- */
    { id: 'HX-ACT-1', name: '著书立说', desc: '闭门著兵法一卷', chapters: [0, 6],
      eff: { attrs: { caixue: 4, shengwang: 2, weiji: 2 }, dev: 0 },
      res: '数月之功，兵书成卷。传抄者众，也有人抄给了不想让你出名的人。' },
    { id: 'HX-ACT-2', name: '置酒高会', desc: '置酒结客（财富-8）', req: { caifu: 8 }, chapters: [0, 6],
      eff: { attrs: { caifu: -8, shengwang: 4, junxin: 2 }, dev: 0 },
      res: '一场大宴，宾主尽欢。散场时，多了几个肯替你说话的人。' },
    { id: 'HX-ACT-3', name: '入宫问安', desc: '趋朝问安，固宠于君（需归汉）', req: { minChapter: 2 }, chapters: [0, 6],
      eff: { attrs: { junxin: 5, weiji: 2 }, dev: 0 },
      res: '你在殿下站了两个时辰，换来三句问话。值。政敌们说你谄，你说他们酸。' },
    { id: 'HX-ACT-4', name: '闭门读书', desc: '谢客静修，温故兵书', chapters: [0, 6],
      eff: { attrs: { caixue: 3, weiji: -2 }, dev: 0 },
      res: '门一关，是非就进不来了。竹简翻动的声音，是乱世里难得的清净。' },
    { id: 'HX-ACT-5', name: '散财养士', desc: '厚币招贤（财富-8）', req: { caifu: 8 }, chapters: [0, 6],
      eff: { attrs: { caifu: -8, weiji: -6, shengwang: 3 }, dev: 0 },
      res: '千金散尽，门下多了几十张嘴，也多了几十双替你看路的眼睛。' },
    { id: 'HX-ACT-6', name: '称病蛰伏', desc: '闭门称病，避人锋芒（需归汉）', req: { minChapter: 2 }, chapters: [0, 6],
      eff: { attrs: { weiji: -8, quanshi: -3, junxin: -2 }, dev: 0 },
      res: '病假条递上去，朝堂少了一个靶子。探病的人来了几拨，真心难辨。' },

    /* ---- 章 0：淮阴 ---- */
    { id: 'HX-ACT-7', name: '替人代笔', desc: '代写书信讼状，以笔糊口', chapters: [0, 0],
      eff: { attrs: { caifu: 4, shengwang: -2 }, dev: 0 },
      res: '你的状纸写得刀刀见骨。润笔不多，够买三日饭。' },
    { id: 'HX-ACT-8', name: '整理兵书', desc: '抄理旧卷，温故知新', chapters: [0, 0],
      eff: { attrs: { caixue: 4, weiji: 2 }, dev: 0 },
      res: '翻烂的兵书重新抄理一遍。有些句子，抄着抄着就长进了骨头里。' },
    { id: 'HX-ACT-9', name: '河边钓叟', desc: '垂纶城下，且放形骸', chapters: [0, 0],
      eff: { attrs: { weiji: -4 }, dev: 0 },
      res: '钓了一下午，鱼没有，心静了。' },
    { id: 'HX-ACT-10', name: '接济邻里', desc: '分粮周急（财富-3）', req: { caifu: 3 }, chapters: [0, 0],
      eff: { attrs: { caifu: -3, shengwang: 3 }, dev: 0 },
      res: '你自己也不宽裕，还是分了一半出去。街坊都记着。' },
    { id: 'HX-ACT-11', name: '市上卖剑', desc: '鬻剑于市，以资川旅', chapters: [0, 0],
      eff: { attrs: { caifu: 5, shengwang: -2 }, dev: 0 },
      res: '剑卖了个好价钱。买剑的人问你来路，你只说：旧主不用了。' },
    { id: 'HX-ACT-12', name: '夜观星象', desc: '仰观天象，默察大势', chapters: [0, 0],
      eff: { attrs: { caixue: 2, weiji: -2 }, dev: 0 },
      res: '星斗稀微，天下的大势在你眼里一点点成形。' },

    /* ---- 章 1：楚营 ---- */
    { id: 'HX-ACT-13', name: '阵前演武', desc: '校场练兵，以武服众', chapters: [1, 1],
      eff: { attrs: { quanshi: 3, shengwang: 2, weiji: 2 }, dev: 0 },
      res: '三场演武，士卒心服。老兵说：这小子，像个带兵的。' },
    { id: 'HX-ACT-14', name: '记室抄书', desc: '为记室抄写军令', chapters: [1, 1],
      eff: { attrs: { caixue: 3 }, dev: 0 },
      res: '军令抄写三百遍，楚军的虚实也在你心里抄了一遍。' },
    { id: 'HX-ACT-15', name: '结交楚将', desc: '折节下交（财富-3）', req: { caifu: 3 }, chapters: [1, 1],
      eff: { attrs: { caifu: -3, shengwang: 3 }, dev: 0 },
      res: '三碗浊酒，几个臂膀。他日用不用得着，谁也说不准。' },
    { id: 'HX-ACT-16', name: '守护辎重', desc: '押运粮草，以勤自效', chapters: [1, 1],
      eff: { attrs: { caifu: 3, weiji: 2 }, dev: 0 },
      res: '粮道三百里，颗粒无损。上官记了你一笔。' },
    { id: 'HX-ACT-17', name: '观项王用兵', desc: '观霸王行军布阵', chapters: [1, 1],
      eff: { attrs: { caixue: 3, weiji: 2 }, dev: 0 },
      res: '他的勇你看懂了，他的短你也看懂了。这一课，值千金。' },
    { id: 'HX-ACT-18', name: '帐外听令', desc: '值夜执戟，近闻枢机', chapters: [1, 1],
      eff: { attrs: { junxin: 2, weiji: 2 }, dev: 0 },
      res: '大帐里的每一句话你都听见了。听见了，也就死心了。' },

    /* ---- 章 2：汉中 ---- */
    { id: 'HX-ACT-19', name: '巡营核粮', desc: '亲巡诸营，勾稽粮账', chapters: [2, 2],
      eff: { attrs: { caifu: 3, caixue: 2 }, dev: 0 },
      res: '三笔假账被你翻了出来。粮官恨你，士卒念你。' },
    { id: 'HX-ACT-20', name: '修缮仓廒', desc: '修仓固廪，以备军需（财富-3）', req: { caifu: 3 }, chapters: [2, 2],
      eff: { attrs: { caifu: -3, quanshi: 3 }, dev: 0 },
      res: '新修的仓廒可支三月。汉王听后点了一次头。' },
    { id: 'HX-ACT-21', name: '结识同僚', desc: '与汉中官吏交游', chapters: [2, 2],
      eff: { attrs: { shengwang: 3, junxin: 2 }, dev: 0 },
      res: '萧何府上的长史，与你换了名刺。' },
    { id: 'HX-ACT-22', name: '上书言事', desc: '以书陈策，自达于上', chapters: [2, 2],
      eff: { attrs: { junxin: 2, caixue: 3 }, dev: 0 },
      res: '奏书递上去了。没有回音，但你知道有人读了。' },
    { id: 'HX-ACT-23', name: '演兵示法', desc: '为诸将演示阵法', chapters: [2, 2],
      eff: { attrs: { quanshi: 4, weiji: 2 }, dev: 0 },
      res: '阵法开合，观者无声。有人回去就把你的图样抄走了。' },
    { id: 'HX-ACT-24', name: '结交郎官', desc: '纳交殿前（财富-3）', req: { caifu: 3 }, chapters: [2, 2],
      eff: { attrs: { caifu: -3, junxin: 2, shengwang: 2 }, dev: 0 },
      res: '殿前执戟的几个郎官，与你换了名刺。大王昨日的喜怒，今晨你就知道了。' },

    /* ---- 章 3：三秦 ---- */
    { id: 'HX-ACT-25', name: '安抚关中', desc: '约法安民（财富-3）', req: { caifu: 3 }, chapters: [3, 3],
      eff: { attrs: { caifu: -3, shengwang: 4, weiji: -2 }, dev: 0 },
      res: '约法三章，秋毫无犯。关中父老说：汉军不扰民。' },
    { id: 'HX-ACT-26', name: '整肃军纪', desc: '申军法于三军', chapters: [3, 3],
      eff: { attrs: { quanshi: 3, weiji: 2 }, dev: 0 },
      res: '斩了两个劫掠的卒子，全军肃然。慈不掌兵，你懂。' },
    { id: 'HX-ACT-27', name: '绘图勘道', desc: '踏勘秦岭诸道', chapters: [3, 3],
      eff: { attrs: { caixue: 3 }, dev: 0 },
      res: '子午、傥骆、褒斜、陈仓——每条道的宽窄险易，都进了你的图。' },
    { id: 'HX-ACT-28', name: '犒赏士卒', desc: '以私财犒军（财富-4）', req: { caifu: 4 }, chapters: [3, 3],
      eff: { attrs: { caifu: -4, shengwang: 3 }, dev: 0 },
      res: '酒肉到营，士气大振。士兵记得韩将军的赏。' },
    { id: 'HX-ACT-29', name: '速修栈道', desc: '督办栈道之役', chapters: [3, 3],
      eff: { attrs: { caifu: 3, quanshi: 3 }, dev: 0 },
      res: '栈道日日有新进展——关中的探子日日有回报。你要的就是他们看。' },
    { id: 'HX-ACT-30', name: '收留降卒', desc: '收编三秦降兵', chapters: [3, 3],
      eff: { attrs: { quanshi: 4, weiji: 3 }, dev: 0 },
      res: '降卒感不杀之恩，愿效死力。你的军队，又厚了一层。' },

    /* ---- 章 4：赵齐 ---- */
    { id: 'HX-ACT-31', name: '犒赏伤兵', desc: '厚恤伤亡（财富-4）', req: { caifu: 4 }, chapters: [4, 4],
      eff: { attrs: { caifu: -4, shengwang: 3, weiji: -2 }, dev: 0 },
      res: '伤者得恤，死者得葬。三军知将军不弃人。' },
    { id: 'HX-ACT-32', name: '研读地志', desc: '读燕赵齐地志', chapters: [4, 4],
      eff: { attrs: { caixue: 3 }, dev: 0 },
      res: '山川关隘、城郭粮道，都在你脑中展开成图。' },
    { id: 'HX-ACT-33', name: '释放俘卒', desc: '释俘遣归，以收人心', chapters: [4, 4],
      eff: { attrs: { shengwang: 3, weiji: -2 }, dev: 0 },
      res: '俘卒跪地号哭而去。燕赵之地，传你的名。' },
    { id: 'HX-ACT-34', name: '修筑壁垒', desc: '筑垒固防，深根固本', chapters: [4, 4],
      eff: { attrs: { quanshi: 3 }, dev: 0 },
      res: '壁垒连成一线。守得住的胜利，才是胜利。' },
    { id: 'HX-ACT-35', name: '问策降将', desc: '虚心问计于降者', chapters: [4, 4],
      eff: { attrs: { caixue: 3, junxin: 2 }, dev: 0 },
      res: '降将知无不言。敌人的地图，从此也是你的地图。' },
    { id: 'HX-ACT-36', name: '巡行齐市', desc: '察齐地民情', chapters: [4, 4],
      eff: { attrs: { shengwang: 2, caifu: 3 }, dev: 0 },
      res: '临淄的富庶让你心惊。这一块地，养得起一支王师。' },

    /* ---- 章 5：齐王 ---- */
    { id: 'HX-ACT-37', name: '缮甲积谷', desc: '缮治甲兵，积储粮谷', chapters: [5, 5],
      eff: { attrs: { quanshi: 4, weiji: 2 }, dev: 0 },
      res: '武库新甲三千领，仓谷支三年。临淄城头的旗，换了新的。' },
    { id: 'HX-ACT-38', name: '延揽齐士', desc: '礼贤下士（财富-3）', req: { caifu: 3 }, chapters: [5, 5],
      eff: { attrs: { caifu: -3, shengwang: 3 }, dev: 0 },
      res: '齐之辩士说客，渐集于你的门下。蒯通，也是其中之一。' },
    { id: 'HX-ACT-39', name: '减免齐赋', desc: '轻徭薄赋，以固齐本（财富-5）', req: { caifu: 5 }, chapters: [5, 5],
      eff: { attrs: { caifu: -5, shengwang: 4 }, dev: 0 },
      res: '赋减三成，齐人讴歌。根基这东西，是拿真金白银换的。' },
    { id: 'HX-ACT-40', name: '密探汉廷', desc: '遣人觇长安动静', chapters: [5, 5],
      eff: { attrs: { caixue: 3, weiji: 2 }, zg: 3, dev: 0 },
      res: '长安的每一份动静你都听了三遍。听得多了，汉廷也听见了你。' },
    { id: 'HX-ACT-41', name: '整训齐军', desc: '大阅齐兵，申严军令', chapters: [5, 5],
      eff: { attrs: { quanshi: 3, weiji: 2 }, dev: 0 },
      res: '齐军新成，行止有度。这支军队听谁的号令，你心里有数。' },
    { id: 'HX-ACT-42', name: '报聘诸侯', desc: '遣使通好于诸侯', chapters: [5, 5],
      eff: { attrs: { junxin: 2, shengwang: 3 }, dev: 0 },
      res: '燕赵来的回使言辞恭敬。天下的棋盘，比你想的大。' },

    /* ---- 章 6：楚与长安 ---- */
    { id: 'HX-ACT-43', name: '散财恤旧', desc: '厚恤故旧乡邻（财富-4）', req: { caifu: 4 }, chapters: [6, 6],
      eff: { attrs: { caifu: -4, shengwang: 3, weiji: -2 }, dev: 0 },
      res: '下邳的乡邻都说：韩楚王，不忘本。' },
    { id: 'HX-ACT-44', name: '闭门读律', desc: '研读汉律，如履薄冰', chapters: [6, 6],
      eff: { attrs: { caixue: 3, weiji: -2 }, dev: 0 },
      res: '律令读得越细，你越明白哪条线不能碰——以及，碰了会怎样。' },
    { id: 'HX-ACT-45', name: '结交近侍', desc: '厚结宫中左右（财富-4）', req: { caifu: 4 }, chapters: [6, 6],
      eff: { attrs: { caifu: -4, junxin: 2 }, dev: 0 },
      res: '宫里的风吹草动，总比别人早半日到你案头。' },
    { id: 'HX-ACT-46', name: '巡视楚地', desc: '巡行楚境，绥抚其民', chapters: [6, 6],
      eff: { attrs: { quanshi: 2, shengwang: 2 }, dev: 0 },
      res: '楚人见故将军，箪食壶浆。你按住心动，只谈农桑。' },
    { id: 'HX-ACT-47', name: '上书自陈', desc: '以书剖白，自明心迹', chapters: [6, 6],
      eff: { attrs: { junxin: 3, weiji: 2 }, dev: 0 },
      res: '剖白的书递上去了。有没有用，你不敢想。' },
    { id: 'HX-ACT-48', name: '深居简出', desc: '杜门谢客，示无他志', chapters: [6, 6],
      eff: { attrs: { weiji: -4, shengwang: -2 }, dev: 0 },
      res: '府门三日不出。长安的眼睛找不到焦点，渐渐散了。' }
  ];

  /* ============ 历史百科词条 ============ */
  var GLOSSARY = {
    '淮阴': '秦县，今江苏淮安。韩信故里，后为楚王都、淮阴侯国。',
    '漂母': '淮阴城下漂洗衣物的老妇，曾饭信数十日。韩信为楚王，赐以千金——"一饭千金"出此。',
    '胯下': '淮阴屠中少年辱信，令出其胯下。信俯出，一市皆笑——"胯下之辱"，后成忍辱负重之典。',
    '项梁': '楚将项燕之子，与侄羽起兵会稽，渡江西进，败死于定陶。',
    '项羽': '名籍字羽，西楚霸王。巨鹿破秦主力，分封十八王，垓下败亡，自刎乌江。',
    '滕公': '夏侯婴，刘邦车夫出身，封滕公。刑场救韩信，后数救刘氏于危。',
    '萧何': '汉初相国。月下追韩信，力荐为大将；晚年又助吕后绐杀韩信——"成也萧何，败也萧何"。',
    '栈道': '秦岭绝壁上凿孔架木的通道，连接汉中与关中。刘邦入蜀时烧绝，示天下无还心。',
    '暗度陈仓': '韩信出兵故道（陈仓）奇袭关中，与"明修栈道"并称，为声东击西之祖。',
    '三秦': '秦亡后项羽三分关中，封章邯、司马欣、董翳为王。韩信东出，传檄而定。',
    '井陉口': '太行八陉之一，今河北井陉。韩信在此背水列阵，以三万破赵二十万。',
    '木罂缶': '以木缚罂缶为筏的渡水器械。韩信以此自夏阳渡河袭魏，兵不血刃。',
    '李左车': '赵之广武君。曾策陈馀深沟高垒勿与韩信战，不用；赵败，韩信师事之。',
    '龙且': '楚之名将，率二十万救齐，轻敌追击，潍水中流被韩信水淹，授首。',
    '垓下': '今安徽灵璧东南。前202年楚汉决战之地，项羽于此败亡。',
    '蒯通': '齐人，著名辩士。说韩信三分天下，不用；后佯狂避祸，得免。',
    '云梦': '云梦泽，今湖北境。汉高帝伪游云梦，会诸侯于陈，遂执韩信。',
    '钟离眜': '楚之良将，项羽败亡后投奔韩信，为帝所怨。韩信献其首于云梦。',
    '陈豨': '汉将，封阳夏侯，监赵代边兵。前197年反于代，后被樊哙军斩。史载韩信曾约为内应。',
    '长乐宫': '汉都长安宫殿名，吕后居之。韩信被绐入贺，斩于宫中钟室。'
  };

  /* ============ 剧本元信息与剧本级配置 ============ */
  var SCENARIO = {
    id: 'hanxin', name: '韩信 · 兵仙之局', sub: '成也萧何，败也萧何',
    era: '约前 220 — 前 196', protag: '韩信',
    desc: '从胯下之辱到长乐钟室——功劳大到封无可封的人，还有没有活路？',
    recommend: '容错中 · 兵仙线（建议先通李斯本）'
  };
  // 主敌威胁/戒心（隐藏值）：韩信剧本 = 刘邦疑心
  var HIDDEN = {
    init: 15, name: '刘邦疑心', showFrom: 2,
    words: [[70, '杀机已动'], [50, '猜忌日深'], [30, '颇有微词'], [0, '尚无猜忌']]
  };
  // 失宠规则归汉拜将后方生效
  var PERSIST = { junxinFrom: 2 };
  // 功业标记分值（韩信剧本：登坛、战役、王爵）
  var MERIT_MAP = { '汉中': 8, '三秦': 10, '破魏': 10, '破赵': 15, '破齐': 15, '齐王': 20, '垓下': 15 };

  return {
    ATTRS: ATTRS, ATTR_NAMES: ATTR_NAMES, INIT: INIT, DIFFICULTY: DIFFICULTY,
    SCENARIO: SCENARIO, HIDDEN: HIDDEN, PERSIST: PERSIST, MERIT_MAP: MERIT_MAP,
    DEV_BANDS: DEV_BANDS, ENDINGS: ENDINGS, CHAPTERS: CHAPTERS,
    CORRECTIONS: CORRECTIONS, ACHIEVEMENTS: ACHIEVEMENTS, KEY_NODE_NAMES: KEY_NODE_NAMES,
    RANDOM_EVENTS: RANDOM_EVENTS, CRISIS_EVENTS: CRISIS_EVENTS, ACTIONS: ACTIONS, GLOSSARY: GLOSSARY
  };
});
