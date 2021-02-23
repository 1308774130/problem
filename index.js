import { accAdd,accDiv,accSub,accMul } from '../../FundScore/OptionScore/components/calcPrecision'
import { message } from 'antd';

export const weightAVG =itemMap=>{ 
    let totalItemWMap = {}
    let firstExistWeight = 0,firstEmptyArr = [],firstKeyArr=[]//一级已填写权重，一级空维度集合
    let breakpoint=null
    let userOrAI = true //用户填写的，补全均分两种情况 区分一下-true用户填写false补全均分
    const BreakPoint = ()=>{
      if(!breakpoint) return 
      let option = userOrAI ? '您填写的权重':'均分补全后权重'
      message.error(`${breakpoint}${option}小于等于0，请检查！`);
      return true;
    }
    for (let firstKey in itemMap) {
      itemMap[firstKey].every(v => {
        const { firstCode, firstName, firstWeight,
          secondCode,secondName, secondWeight,
          thirdCode,thirdName, thirdWeight,
          itemDesc,itemWeight
        } = v
        const itemId = v.itemId+'_' //因为评分项id和一级维度id都是从1开始自增的，会重复，+'_'进行区分
        /**
         * child该维度下的直接子元素code集合
         * weight该维度的权重
         * emptyChildNum该维度下的直接子元素有几个是未填的（不包括<=0)
         */
        if (_.isNil(totalItemWMap[firstCode])){
          if(firstWeight.toString()!='' && Number(firstWeight)<=0){
            breakpoint = `一级维度 ${firstName} `
            return false
          }
          firstWeight.toString()===''?firstEmptyArr.push(firstCode):firstExistWeight+=Number(firstWeight)
          firstKeyArr.push(firstCode)
          totalItemWMap[firstCode] = {
            child:[],
            weight:Number(firstWeight),
            text:firstName,
            emptyChildArr:[],
            existWeight:0,
            level:1
          }
        }
        if (_.isNil(totalItemWMap[secondCode])){
          totalItemWMap[secondCode] = {
            child:[],
            weight:Number(secondWeight),
            text:secondName,
            emptyChildArr:[],
            existWeight:0,
            level:2
          }
          totalItemWMap[firstCode].child.push(secondCode)
          totalItemWMap[firstCode].existWeight+=Number(secondWeight)
          if(secondWeight===''){
            totalItemWMap[firstCode].emptyChildArr.push(secondCode)
          }else if(Number(secondWeight)<=0 && !totalItemWMap[firstCode].errorChild){
            totalItemWMap[firstCode].errorChild = `二级维度 ${secondName} `
          }
        }
        if (_.isNil(totalItemWMap[thirdCode])){
          totalItemWMap[thirdCode] = {
            child:[],
            weight:Number(thirdWeight),
            text:thirdName,
            emptyChildArr:[],
            existWeight:0,
            level:3
          }
          totalItemWMap[secondCode].child.push(thirdCode)
          totalItemWMap[secondCode].existWeight+=Number(thirdWeight)
          if(thirdWeight==''){
            totalItemWMap[secondCode].emptyChildArr.push(thirdCode)
          }else if(Number(thirdWeight)<=0 && !totalItemWMap[secondCode].errorChild){
            totalItemWMap[secondCode].errorChild = `三级维度 ${thirdName} `
          }
        }
        if (_.isNil(totalItemWMap[itemId])){
          totalItemWMap[itemId] = {
            child:null,
            text:itemDesc,
            weight:Number(itemWeight),
            existWeight:0,
            level:4
          }
          totalItemWMap[thirdCode].child.push(itemId)
          totalItemWMap[thirdCode].existWeight+=Number(itemWeight)
          if(itemWeight===''){
            totalItemWMap[thirdCode].emptyChildArr.push(itemId)
          }else if(Number(itemWeight)<=0 && !totalItemWMap[thirdCode].errorChild){
            totalItemWMap[secondCode].errorChild = `评分项 ${itemDesc} `
          }
        }
        return true
      })
    }
    if(BreakPoint()) return
    /**
     * 计算每层的权重均分
     */
    const callAccWeight = (totalWeight,emptyArray,existWeight,level)=>{ 
      const UnexistNum= emptyArray.length
      const mul = UnexistNum>1?true:false;//有2个及以上空权重
      let surplusFirstL
      const surplusFirstI = accDiv(accSub(totalWeight,existWeight),UnexistNum) //一级均分每个权重-每个
      if(surplusFirstI<=0){
        breakpoint = `${level} ${totalItemWMap[emptyArray[0]].text} `;
        userOrAI = false;
        BreakPoint()
        return 
      }
      mul && (surplusFirstL = accSub(totalWeight,accAdd(accMul(surplusFirstI,UnexistNum-1),existWeight)))  //一级均分每个权重-最后一个
      if(mul && surplusFirstL<=0){
          breakpoint = `${level} ${totalItemWMap[emptyArray[UnexistNum-1]].text} `;
          userOrAI = false;
          BreakPoint()
          return 
      }
      emptyArray.forEach(v=>{
        totalItemWMap[v].weight = surplusFirstI
      })
      surplusFirstL && (totalItemWMap[emptyArray[UnexistNum-1]].weight = surplusFirstL)
      return true
    }
    if(firstEmptyArr.length){
      //一级有空权重
      if(!callAccWeight(100,firstEmptyArr,firstExistWeight,'一级维度'))
        return 
    }
    /**
     * 二级检测
     */
    let secondKeyArr = []
    if(firstKeyArr.some(v=>{
      secondKeyArr = secondKeyArr.concat(totalItemWMap[v].child)
      if(totalItemWMap[v].errorChild){
        breakpoint = totalItemWMap[v].errorChild
        return BreakPoint()
      }
      if(totalItemWMap[v].emptyChildArr.length){
        if(!callAccWeight(totalItemWMap[v].weight,totalItemWMap[v].emptyChildArr,totalItemWMap[v].existWeight,'二级维度'))
          return true
      }
      return false
    })) return
    /**
     * 三级检测
     */
    let thirdKeyArr = []
    if(secondKeyArr.some(v=>{
      thirdKeyArr = thirdKeyArr.concat(totalItemWMap[v].child)
      if(totalItemWMap[v].errorChild){
        breakpoint = totalItemWMap[v].errorChild
        return BreakPoint()
      }
      if(totalItemWMap[v].emptyChildArr.length){
        if(!callAccWeight(totalItemWMap[v].weight,totalItemWMap[v].emptyChildArr,totalItemWMap[v].existWeight,'三级维度'))
          return true
      }
      return false
    })) return
    /**
     * 评分项检测
     */
    if(thirdKeyArr.some(v=>{
      if(totalItemWMap[v].errorChild){
        breakpoint = totalItemWMap[v].errorChild
        return BreakPoint()
      }
      if(totalItemWMap[v].emptyChildArr.length){
        if(!callAccWeight(totalItemWMap[v].weight,totalItemWMap[v].emptyChildArr,totalItemWMap[v].existWeight,'评分项'))
          return true
      }
      return false
    })) return

    //totalItemWMap是均分完了再塞回去
    for (let firstKey in itemMap) {
      itemMap[firstKey] = itemMap[firstKey].map(v => {
        const { firstCode, secondCode,thirdCode
        } = v
        const itemId = v.itemId+'_'
        return {
          ...v,
          firstWeight:totalItemWMap[firstCode].weight,
          secondWeight:totalItemWMap[secondCode].weight,
          thirdWeight:totalItemWMap[thirdCode].weight,
          itemWeight:totalItemWMap[itemId].weight,
        }
      })
    }
    message.success('均分完成，请查看！')
    return itemMap
} 
