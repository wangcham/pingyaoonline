import {addSurveyDistrict} from './west-link-district.js';
import {createSouthCityLayout,southCitySurvey,southCityOpenGround,southCityAlleys,isSouthCityStudy,southCityRoadClear} from './south-city-survey.js';
export function addSouthCity(scene){
 return addSurveyDistrict(scene,{name:'南城连续街坊 · 柳根街至南外环',layout:createSouthCityLayout,survey:southCitySurvey,openGround:southCityOpenGround,alleys:southCityAlleys,contains:isSouthCityStudy,roadClear:southCityRoadClear,reserved:()=>false,useRaster:false,treeSpacing:44,treeSeparation:18});
}
