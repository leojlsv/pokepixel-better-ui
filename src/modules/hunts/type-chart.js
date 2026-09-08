export const pokemonTypes = ['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const strong = {
  normal:[],fire:['grass','ice','bug','steel'],water:['fire','ground','rock'],electric:['water','flying'],grass:['water','ground','rock'],ice:['grass','ground','flying','dragon'],fighting:['normal','ice','rock','dark','steel'],poison:['grass','fairy'],ground:['fire','electric','poison','rock','steel'],flying:['grass','fighting','bug'],psychic:['fighting','poison'],bug:['grass','psychic','dark'],rock:['fire','ice','flying','bug'],ghost:['psychic','ghost'],dragon:['dragon'],dark:['psychic','ghost'],steel:['ice','rock','fairy'],fairy:['fighting','dragon','dark'],
};
const weak = {
  normal:['rock','steel'],fire:['fire','water','rock','dragon'],water:['water','grass','dragon'],electric:['electric','grass','dragon'],grass:['fire','grass','poison','flying','bug','dragon','steel'],ice:['fire','water','ice','steel'],fighting:['poison','flying','psychic','bug','fairy'],poison:['poison','ground','rock','ghost'],ground:['grass','bug'],flying:['electric','rock','steel'],psychic:['psychic','steel'],bug:['fire','fighting','poison','flying','ghost','steel','fairy'],rock:['fighting','ground','steel'],ghost:['dark'],dragon:['steel'],dark:['fighting','dark','fairy'],steel:['fire','water','electric','steel'],fairy:['fire','poison','steel'],
};
const immune = {normal:['ghost'],ground:['electric'],flying:['ground'],ghost:['normal','fighting'],dark:['psychic'],steel:['poison'],fairy:['dragon']};

export function defensiveMultipliers(defenders) {
  const types=[...new Set(defenders.filter(type=>pokemonTypes.includes(type)))];
  return pokemonTypes.map(type=>({type,multiplier:types.reduce((value,defender)=>
    value*(immune[defender]?.includes(type)?0:strong[type]?.includes(defender)?2:weak[type]?.includes(defender)?.5:1),1)}));
}
