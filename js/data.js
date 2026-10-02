// 棋盘、角色、卡片这些固定数据。界面和规则都从这里读

// 8 组城市的颜色：糖果色，摆在奶油色的格子上
export const GROUPS = [
  {name: '可可', color: '#c79a7b'},
  {name: '天蓝', color: '#7fd0ef'},
  {name: '樱粉', color: '#ff92c2'},
  {name: '橘子', color: '#ffad5f'},
  {name: '西瓜', color: '#ff6f78'},
  {name: '柠檬', color: '#ffd54f'},
  {name: '薄荷', color: '#6fd6a0'},
  {name: '蓝莓', color: '#7b8cff'}
];

// lm：格子上摆的小地标（landmarks.js 里有同名的模型）；spot：地标叫什么；blurb：卡片上的一句话
const city = (g, n, p, r, hc, lm, spot, blurb) => ({t: 'prop', g, n, p, r, hc, lm, spot, blurb});
// r：过路费，依次是 空地、1 栋、2 栋、3 栋、4 栋、酒店；hc：盖一栋的钱
export const SQ = [
  {t: 'go', n: '起点', lm: 'gate', blurb: '每次经过这里领 200 元路费。'},
  city(0, '西宁', 60, [2, 10, 30, 90, 160, 250], 50, 'taersi', '塔尔寺', '高原上的夏都，塔尔寺的金顶在阳光下闪闪发亮。'),
  {t: 'fate', n: '命运', lm: 'orb', blurb: '抽一张命运卡：也许是惊喜，也许要掏钱。'},
  city(0, '银川', 60, [4, 20, 60, 180, 320, 450], 50, 'xixia', '西夏王陵', '贺兰山脚下的塞上江南，王陵像一座座土黄色的金字塔。'),
  {t: 'tax', n: '个税', amt: 200, lm: 'coins', blurb: '走到这里要交 200 元税。'},
  {t: 'station', n: '高铁站', p: 200, lm: 'train', blurb: '车站越多，过路费越贵：1 个 25，2 个 50，3 个 100，4 个 200。'},
  city(1, '拉萨', 100, [6, 30, 90, 270, 400, 550], 50, 'potala', '布达拉宫', '离天最近的城市，布达拉宫立在红山顶上，白墙红墙金屋顶。'),
  {t: 'chance', n: '机会', lm: 'qmark', blurb: '抽一张机会卡：可能领钱，也可能被送去别的城市。'},
  city(1, '兰州', 100, [6, 30, 90, 270, 400, 550], 50, 'waterwheel', '黄河水车', '一碗牛肉面，一座铁桥，一架慢慢转的大水车。'),
  city(1, '南宁', 120, [8, 40, 100, 300, 450, 600], 50, 'longxiang', '龙象塔', '四季常绿的绿城，青秀山上的龙象塔看得见整座城。'),
  {t: 'jail', n: '监狱', lm: 'jail', blurb: '路过这里没事。被关进来要交 50 元、用出狱卡，或者掷出对子才能出去。'},
  city(2, '贵阳', 140, [10, 50, 150, 450, 625, 750], 100, 'jiaxiu', '甲秀楼', '凉爽的山城，甲秀楼踩着石桥站在南明河里。'),
  {t: 'shop', n: '道具店', lm: 'stall', blurb: '走到这里可以买道具卡，货架上每次摆三张，每人最多揣 3 张。'},
  city(2, '昆明', 140, [10, 50, 150, 450, 625, 750], 100, 'jinma', '金马碧鸡坊', '春城四季如春，冬天海鸥飞来滇池做客。'),
  city(2, '海口', 160, [12, 60, 180, 500, 700, 900], 100, 'coconut', '椰林骑楼', '椰风海韵，骑楼老街里有一碗清补凉。'),
  {t: 'station', n: '机场', p: 200, lm: 'plane', blurb: '车站越多，过路费越贵：1 个 25，2 个 50，3 个 100，4 个 200。'},
  city(3, '长沙', 180, [14, 70, 200, 550, 750, 950], 100, 'aiwan', '爱晚亭', '岳麓山的红枫，爱晚亭的秋天，夜里的小龙虾。'),
  {t: 'fate', n: '命运', lm: 'orb', blurb: '抽一张命运卡：也许是惊喜，也许要掏钱。'},
  city(3, '南昌', 180, [14, 70, 200, 550, 750, 950], 100, 'tengwang', '滕王阁', '落霞与孤鹜齐飞，秋水共长天一色。'),
  city(3, '合肥', 200, [16, 80, 220, 600, 800, 1000], 100, 'tokamak', '人造太阳', '科学岛上有一颗人造太阳，比真太阳还烫。'),
  {t: 'park', n: '游乐场', lm: 'rides', blurb: '下一版在这里玩小游戏。'},
  city(4, '郑州', 220, [18, 90, 250, 700, 875, 1050], 150, 'erqi', '二七塔', '中原腹地，二七塔的钟声每天准时响起。'),
  {t: 'chance', n: '机会', lm: 'qmark', blurb: '抽一张机会卡：可能领钱，也可能被送去别的城市。'},
  city(4, '西安', 220, [18, 90, 250, 700, 875, 1050], 150, 'dayan', '大雁塔', '十三朝古都，大雁塔下看灯，城墙上骑车。'),
  city(4, '武汉', 240, [20, 100, 300, 750, 925, 1100], 150, 'huanghe', '黄鹤楼', '黄鹤楼上看长江，过早要吃热干面。'),
  {t: 'station', n: '港口', p: 200, lm: 'ship', blurb: '车站越多，过路费越贵：1 个 25，2 个 50，3 个 100，4 个 200。'},
  city(5, '天津', 260, [22, 110, 330, 800, 975, 1150], 150, 'tianjineye', '天津之眼', '海河上的大摩天轮，架在桥上慢慢转。'),
  city(5, '重庆', 260, [22, 110, 330, 800, 975, 1150], 150, 'hongya', '洪崖洞', '山城的夜晚，洪崖洞层层叠叠亮起灯。'),
  {t: 'bank', n: '银行', lm: 'bank', blurb: '下一版开门：可以存钱、借钱。'},
  city(5, '成都', 280, [24, 120, 360, 850, 1025, 1200], 150, 'panda', '熊猫基地', '慢悠悠的天府之国，熊猫抱着竹子啃个不停。'),
  {t: 'gojail', n: '进监狱', lm: 'police', blurb: '走到这里直接进监狱，不经过起点。'},
  city(6, '杭州', 300, [26, 130, 390, 900, 1100, 1275], 200, 'leifeng', '雷峰塔', '西湖边的雷峰塔，断桥上等一个人。'),
  city(6, '广州', 300, [26, 130, 390, 900, 1100, 1275], 200, 'canton', '广州塔', '小蛮腰亮起来，早茶吃起来。'),
  {t: 'stock', n: '证券所', lm: 'chart', blurb: '下一版开市：可以买卖股票。'},
  city(6, '深圳', 320, [28, 150, 450, 1000, 1200, 1400], 200, 'shenzhen', '摩天楼', '一夜之间长高的城市，玻璃楼里亮到天明。'),
  {t: 'station', n: '汽车站', p: 200, lm: 'bus', blurb: '车站越多，过路费越贵：1 个 25，2 个 50，3 个 100，4 个 200。'},
  {t: 'chance', n: '机会', lm: 'qmark', blurb: '抽一张机会卡：可能领钱，也可能被送去别的城市。'},
  city(7, '上海', 350, [35, 175, 500, 1100, 1300, 1500], 200, 'pearl', '东方明珠', '外滩的灯，陆家嘴的塔，黄浦江上的船。'),
  {t: 'tax', n: '奢侈税', amt: 100, lm: 'coins', blurb: '走到这里要交 100 元税。'},
  city(7, '北京', 400, [50, 200, 600, 1400, 1700, 2000], 200, 'tiantan', '天坛', '祈年殿的蓝瓦，胡同里的秋天，全国最贵的一格。')
];
export const N = SQ.length;
export const JAIL = 10, GOJAIL = 30;
export const STATIONS = SQ.map((s, i) => (s.t === 'station' ? i : -1)).filter(i => i >= 0);
export const GROUP_SQ = GROUPS.map((_, g) => SQ.map((s, i) => (s.t === 'prop' && s.g === g ? i : -1)).filter(i => i >= 0));
export const START_CASH = 1500, PASS_GO = 200, JAIL_FINE = 50;
// 平衡用的几个数：过路费倍数、电脑盖房子时留多少钱、几个角色本事的大小（用 sim2.mjs 跑出来的）
export const TUNE = {rentMul: 1, botReserve: 200, botBuyKeep: 180, sheepBonus: 100, pandaOff: 0.75, tigerUp: 1.2, foxOff: 0.8, pigOff: 0.8};
// 车站过路费：有 1/2/3/4 个
export const STATION_RENT = [0, 25, 50, 100, 200];

// 角色：每个人开局选一个，每个角色有一个本事
export const CHARS = [
  {id: 'sheep', name: '咩咩', emoji: '🐑', color: '#b9a5ff', skill: '勤劳', desc: '经过起点多领 100 元'},
  {id: 'panda', name: '团团', emoji: '🐼', color: '#5fd4b0', skill: '包工头', desc: '盖房子打七五折'},
  {id: 'tiger', name: '虎妞', emoji: '🐯', color: '#ffa94d', skill: '霸气', desc: '收过路费多收两成'},
  {id: 'rabbit', name: '跳跳', emoji: '🐰', color: '#ff87b7', skill: '蹦跶', desc: '掷骰子前可以选只掷一颗'},
  {id: 'fox', name: '阿狸', emoji: '🦊', color: '#ff7a59', skill: '精明', desc: '交过路费少两成'},
  {id: 'pig', name: '福福', emoji: '🐷', color: '#62b6ff', skill: '福气', desc: '买城市打八折'}
];
// 道具卡：道具店里买，每人最多揣 3 张。when：roll 掷骰子前用，any 自己回合里随时用，passive 自动生效
export const ITEMS = {
  dice: {name: '遥控骰子', ico: '🎲', price: 150, when: 'roll', desc: '这一次不掷骰子，自己定两颗骰子的点数（不算对子）。'},
  rocket: {name: '火箭', ico: '🚀', price: 120, when: 'roll', desc: '不掷骰子，直接飞到自己任意一座城市或车站（不经过起点）。'},
  pass: {name: '免费通行证', ico: '🛡️', price: 150, when: 'passive', desc: '下一次该交过路费的时候自动用掉，一分不用交。'},
  wreck: {name: '拆迁队', ico: '💣', price: 200, when: 'any', desc: '拆掉对手一座城市的一栋房子（大酒店拆成四栋）。'},
  swap: {name: '换位符', ico: '🔄', price: 120, when: 'any', desc: '和一个对手交换棋子的位置，换完照常掷骰子。'},
  double: {name: '双倍通行费', ico: '💰', price: 180, when: 'any', desc: '到你下一回合之前，别人交给你的过路费翻倍。'},
  sleep: {name: '瞌睡虫', ico: '😴', price: 160, when: 'any', desc: '让一个对手跳过他的下一回合。'}
};
export const ITEM_IDS = Object.keys(ITEMS);
export const HAND = 3;
export const SHOP = 12;
export const BOT_NAMES = ['电脑·阿财', '电脑·小富', '电脑·大款', '电脑·旺旺', '电脑·多多'];

export const CHANCE = [
  {text: '直达起点，领 200 元', k: 'to', pos: 0},
  {text: '去北京看天坛', k: 'to', pos: 39},
  {text: '坐车去最近的车站', k: 'station'},
  {text: '走错路了，后退三格', k: 'back', n: 3},
  {text: '违章被抓，直接进监狱', k: 'jail'},
  {text: '中了彩票，领 150 元', k: 'money', v: 150},
  {text: '超速罚款 30 元', k: 'money', v: -30},
  {text: '拿到一张出狱卡，可以留着用', k: 'card'},
  {text: '当选旅游大使，给每位玩家发 50 元', k: 'each', v: -50},
  {text: '去广州喝早茶', k: 'to', pos: 32},
  {text: '去西安逛大雁塔', k: 'to', pos: 23},
  {text: '分红到账，领 100 元', k: 'money', v: 100},
  {text: '去成都看熊猫', k: 'to', pos: 29},
  {text: '去拉萨看布达拉宫', k: 'to', pos: 6},
  {text: '去杭州逛西湖', k: 'to', pos: 31},
  {text: '飞去海口晒太阳', k: 'to', pos: 14},
  {text: '走错路了，后退两格', k: 'back', n: 2},
  {text: '拍了张爆款旅行照，领 80 元', k: 'money', v: 80},
  {text: '行李超重，交 60 元', k: 'money', v: -60},
  {text: '帮老奶奶过马路，每位玩家给你 20 元', k: 'each', v: 20},
  {text: '去道具店逛逛', k: 'to', pos: 12}
];
export const FATE = [
  {text: '银行算错了账，你多得 200 元', k: 'money', v: 200},
  {text: '看病花了 50 元', k: 'money', v: -50},
  {text: '卖掉旧家具，得 50 元', k: 'money', v: 50},
  {text: '今天过生日，每位玩家送你 20 元', k: 'each', v: 20},
  {text: '房屋维修：每栋房子 25 元，每家酒店 100 元', k: 'repair'},
  {text: '拿到一张出狱卡，可以留着用', k: 'card'},
  {text: '偷税被查，直接进监狱', k: 'jail'},
  {text: '直达起点，领 200 元', k: 'to', pos: 0},
  {text: '发年终奖 100 元', k: 'money', v: 100},
  {text: '交学费 100 元', k: 'money', v: -100},
  {text: '捡到钱包交给警察，得到奖励 30 元', k: 'money', v: 30},
  {text: '请大家喝奶茶，给每位玩家 10 元', k: 'each', v: -10},
  {text: '捡到一只流浪猫，花 40 元买猫粮', k: 'money', v: -40},
  {text: '写的游记上了热门，领 120 元', k: 'money', v: 120},
  {text: '手机掉水里了，修手机花 80 元', k: 'money', v: -80},
  {text: '请大家吃火锅，给每位玩家 30 元', k: 'each', v: -30},
  {text: '老家寄来了特产，卖了 60 元', k: 'money', v: 60},
  {text: '街头弹琴被路人打赏 40 元', k: 'money', v: 40},
  {text: '停车被贴条，交 50 元', k: 'money', v: -50},
  {text: '被评为文明游客，领 100 元', k: 'money', v: 100}
];
