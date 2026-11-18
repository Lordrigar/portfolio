// Speak actual graphemes, never phonetic spellings such as ká/cé.
// Some voices spell those artificial strings out as K + accented A, C + accented E.
const markedLetters = {
  á: 'dlouhé a', č: 'c s háčkem', ď: 'd s háčkem',
  é: 'dlouhé e', ě: 'e s háčkem', í: 'dlouhé měkké i',
  ň: 'n s háčkem', ó: 'dlouhé o', ř: 'r s háčkem',
  š: 's s háčkem', ť: 't s háčkem', ú: 'u s čárkou',
  ů: 'u s kroužkem', ý: 'dlouhé tvrdé y', ž: 'z s háčkem',
};
export function letterName(letter) {
  const value = letter.normalize('NFC').toLocaleLowerCase('cs');
  if (markedLetters[value]) return markedLetters[value];
  return value;
}
export function lettersOf(word) {
  return word.normalize('NFC').toLocaleLowerCase('cs').match(/ch|./gu) || [];
}
export function searchKey(value) { return value.toLocaleLowerCase('cs').normalize('NFD').replace(/\p{Diacritic}/gu, ''); }

const sets = [
  ['animals', 'Zvířátka', '🦊', '#ffe8cf', [['pes','🐶'],['kočka','🐱'],['liška','🦊'],['sova','🦉'],['ježek','🦔'],['kůň','🐴'],['kráva','🐮'],['žába','🐸'],['myš','🐭'],['králík','🐰']]],
  ['fairytales', 'Pohádky', '👑', '#f2e3ff', [['princezna','👸'],['král','🤴'],['koruna','👑'],['drak','🐉'],['hrad','🏰'],['víla','🧚'],['kouzlo','🪄'],['jednorožec','🦄'],['meč','🗡️'],['duch','👻']]],
  ['food', 'Dobroty', '🍓', '#ffe1e9', [['jablko','🍎'],['hruška','🍐'],['banán','🍌'],['jahoda','🍓'],['chléb','🍞'],['sýr','🧀'],['vejce','🥚'],['mrkev','🥕'],['dort','🎂'],['med','🍯']]],
  ['nature', 'Příroda', '🌻', '#e4f2d9', [['strom','🌳'],['květina','🌷'],['list','🍃'],['houba','🍄'],['slunce','☀️'],['měsíc','🌙'],['hvězda','⭐'],['mrak','☁️'],['duha','🌈'],['hora','⛰️']]],
  ['travel', 'Na cestách', '🚂', '#dfefff', [['auto','🚗'],['vlak','🚂'],['loď','⛵'],['letadlo','✈️'],['kolo','🚲'],['autobus','🚌'],['raketa','🚀'],['traktor','🚜'],['vrtulník','🚁'],['koloběžka','🛴']]],
  ['home', 'Doma', '🏡', '#fceccf', [['dům','🏠'],['dveře','🚪'],['postel','🛏️'],['židle','🪑'],['klíč','🔑'],['lampa','💡'],['hodiny','🕰️'],['vana','🛁'],['koště','🧹'],['zrcadlo','🪞']]],
  ['sea', 'Pod hladinou', '🐳', '#d9f3f2', [['ryba','🐟'],['velryba','🐳'],['delfín','🐬'],['žralok','🦈'],['krab','🦀'],['chobotnice','🐙'],['želva','🐢'],['mušle','🐚'],['medúza','🪼'],['korál','🪸']]],
  ['christmas', 'Vánoce', '🎄', '#e0f0e6', [['stromek','🎄'],['dárek','🎁'],['zvonek','🔔'],['svíčka','🕯️'],['sněhulák','⛄'],['vločka','❄️'],['sob','🦌'],['anděl','👼'],['sušenka','🍪'],['ponožka','🧦']]],
  ['play', 'Hrajeme si', '🧸', '#f4e4f4', [['míč','⚽'],['panenka','🪆'],['medvídek','🧸'],['kostka','🎲'],['puzzle','🧩'],['balónek','🎈'],['pastelka','🖍️'],['buben','🥁'],['kytara','🎸'],['kniha','📖']]],
  ['garden', 'Na zahradě', '🦋', '#eef2d7', [['motýl','🦋'],['včela','🐝'],['beruška','🐞'],['šnek','🐌'],['mravenec','🐜'],['pavouk','🕷️'],['slunečnice','🌻'],['tulipán','🌷'],['třešně','🍒'],['hrozny','🍇']]],
];
export const themes = sets.map(([id, title, icon, color, words]) => ({ id, title, icon, color, words: words.map(([word, picture]) => ({ id: `${id}-${word}`, word, picture, theme: id })) }));
export function wordCount(count) { return `${count} ${count === 1 ? 'slovíčko' : count >= 2 && count <= 4 ? 'slovíčka' : 'slovíček'}`; }
export const allWords = themes.flatMap(theme => theme.words);
