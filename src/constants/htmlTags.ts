
/**
 * 지원되는 HTML 태그 목록
 * const assertion을 사용하여 타입 레벨에서도 활용 가능
 */
export const htmlTags = [
  "a","abbr","address","article","aside","b","bdi","bdo","blockquote","button","canvas","cite","code","data","datalist","dd","del","details","dfn","dialog","div","dl","dt","em","fieldset","figcaption","figure","footer","form","h1","h2","h3","h4","h5","h6","header","hr","i","img","input","ins","kbd","label","legend","li","main","map","mark","menu","meter","nav","ol","option","output","p","picture","pre","progress","q","rp","rt","ruby","s","samp","section","select","small","span","strong","sub","summary","sup","table","tbody","td","textarea","tfoot","th","thead","time","tr","u","ul","var","video"
] as const;

/**
 * HTML 태그 이름의 유니온 타입
 */
export type HtmlTag = typeof htmlTags[number];