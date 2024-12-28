/** CamelCased 문자를 SnakeCased 문자로 변경 */
export function camelToSnakeCase(str: string): string {
  return (
    str
      // 대문자를 _소문자 형태로 변경
      .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
      // 시작 지점에 있는 _ 모두 제거
      .replace(/^_+/, '')
  );
}

/** 랜덤 닉네임 생성 함수 */
export function createRandomNickname(withRandomNumber = true): string {
  const adjectives = [
    '뛰어난',
    '놀라운',
    '힘센',
    '반짝이는',
    '창백한',
    '미끄러운',
    '따가운',
    '불타는',
    '매력적인',
    '까부는',
    '애정어린',
    '차가운',
    '청아한',
    '청초한',
    '무서운',
    '매서운',
    '날카로운',
    '무딘',
    '둔한',
    '예민한',
    '섬세한',
    '순진한',
    '순수한',
    '예쁜',
    '붉은',
    '파란',
    '검은',
    '새까만',
  ];

  const nouns = [
    '벨루가',
    '원숭이',
    '고릴라',
    '침팬치',
    '토끼',
    '고양이',
    '멍멍이',
    '펭귄',
    '드래곤',
    '코끼리',
    '여우',
    '늑대',
    '살쾡이',
    '코요테',
    '라마',
    '부엉이',
    '거북이',
    '악어',
    '사슴',
    '노루',
    '고라니',
    '까마귀',
    '참새',
    '독수리',
    '거위',
    '오리',
    '너구리',
    '조랑말',
    '당나귀',
    '살모사',
    '구렁이',
    '까치',
    '제비',
    '돌고래',
    '향유고래',
    '범고래',
    '북극곰',
    '물범',
    '표범',
    '호랑이',
    '사자',
    '하이에나',
    '가젤',
    '코뿔소',
    '들소',
    '물소',
  ];

  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

  if (withRandomNumber) {
    return `${randomAdjective}${randomNoun}` + (Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000);
  } else {
    return `${randomAdjective}${randomNoun}`;
  }
}
