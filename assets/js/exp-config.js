

function verifyPlayerLevel(experiencia) {
  const tabelaExperiencia = {
    '0': 0,
    'b1': 20000,
    'b2': 50000,
    'b3': 85000,
    'b4': 130000,
    'b5': 185000,
    'i1': 260000,
    'i2': 350000,
    'i3': 460000,
    'i4': 590000,
    'i5': 750000,
    'a1': 930000,
    'a2': 1150000,
    'a3': 1410000,
    'a4': 1720000,
    'a5': 2100000,
    'e1': 2550000,
    'e2': 3100000,
    'e3': 3750000,
    'e4': 4550000,
    'e5': 5500000,
    'm': 6700000,
    };

  let level = '0'; // Nível inicial
  for (const expLevel in tabelaExperiencia) {
    if (experiencia >= tabelaExperiencia[expLevel]) {
      level = expLevel;
    } else {
      break; // Se a experiência for menor que o nível atual, não precisa continuar
    }
  }
  return verifyPlayerRank(level);
}

function verifyPlayerRank(level) {
switch (level) {
  case '0':
    return 'Little Baby Lv.0';
    break;
  case 'b1':
    return 'Beginner Lv.1'
    break;
  case 'b2':
    return 'Beginner Lv.2'
    break;
  case 'b3':
    return 'Beginner Lv.3'
    break;
  case 'b4':
    return 'Beginner Lv.4'
    break;
  case 'b5':
    return 'Beginner Lv.5'
    break;
  case 'i1':
    return 'Intermediate Lv.1'
    break;
  case 'i2':
    return 'Intermediate Lv.2'
    break;
  case 'i3':
    return 'Intermediate Lv.3'
    break;
  case 'i4':
    return 'Intermediate Lv.4'
    break;
  case 'i5':
    return 'Intermediate Lv.5'
    break;
  case 'a1':
    return 'Advanced Lv.1'
    break;
  case 'a2':
    return 'Advanced Lv.2'
    break;
  case 'a3':
    return 'Advanced Lv.3'
    break;
  case 'a4':
    return 'Advanced Lv.4'
    break;
  case 'a5':
    return 'Advanced Lv.5'
    break;
  case 'e1':
    return 'Expert Lv.1'
    break;
  case 'e2':
    return 'Expert Lv.2'
    break;
  case 'e3':
    return 'Expert Lv.3'
    break;
  case 'e4':
    return 'Expert Lv.4'
    break;
  case 'e5':
    return 'Expert Lv.5'
    break;
  case 'm':
    return 'Master Lv.!!'
    break;
  default:
    return 'Undefined Lv.??'
    break;
}
}

function getLevelInfo(experiencia) {
  const levels = [
    { key: '0', exp: 0 },
    { key: 'b1', exp: 20000 },
    { key: 'b2', exp: 50000 },
    { key: 'b3', exp: 85000 },
    { key: 'b4', exp: 130000 },
    { key: 'b5', exp: 185000 },
    { key: 'i1', exp: 260000 },
    { key: 'i2', exp: 350000 },
    { key: 'i3', exp: 460000 },
    { key: 'i4', exp: 590000 },
    { key: 'i5', exp: 750000 },
    { key: 'a1', exp: 930000 },
    { key: 'a2', exp: 1150000 },
    { key: 'a3', exp: 1410000 },
    { key: 'a4', exp: 1720000 },
    { key: 'a5', exp: 2100000 },
    { key: 'e1', exp: 2550000 },
    { key: 'e2', exp: 3100000 },
    { key: 'e3', exp: 3750000 },
    { key: 'e4', exp: 4550000 },
    { key: 'e5', exp: 5500000 },
    { key: 'm', exp: 6700000 }
  ];

  let currentIndex = 0;
  for (let i = 0; i < levels.length; i++) {
    if (experiencia >= levels[i].exp) currentIndex = i;
    else break;
  }
  const current = levels[currentIndex];
  const next = (currentIndex + 1 < levels.length) ? levels[currentIndex + 1] : null;
  return {
    levelKey: current.key,
    levelName: verifyPlayerRank(current.key),
    currentExpThreshold: current.exp,
    nextExpThreshold: next ? next.exp : null
  };
}