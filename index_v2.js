import { accAdd, accDiv, accSub, accMul } from '../../FundScore/OptionScore/components/calcPrecision'
import { message } from 'antd';

export const weightAVG = itemMap => {
    let totalItemWMap = {}
    let firstExistWeight = 0, firstEmptyArr = [], firstKeyArr = []//一级已填写权重，一级空维度集合
    let breakpoint = null
    let userOrAI = true //用户填写的，补全均分两种情况 区分一下-true用户填写false补全均分
    const BreakPoint = () => {
        if (!breakpoint) return
        let option = userOrAI ? '您填写的权重' : '均分补全后权重'
        message.error(`${breakpoint}${option}小于等于0，请检查！`);
        return true;
    }
    const CheckHasError=level => {
        //检查这个维度上级是否有不合格权重（<=0)
        let checkArr = [];
        ['first','second','third','item'].some(v=>{
            checkArr.push(v)
            return v==level
        })
        return checkArr.some(v=>errorChild.hasOwnProperty(v))
    }
    let errorChild = {}
    const firstKey = ['产品', '人员', '理念', '流程', '业绩'].filter(v=>itemMap.hasOwnProperty(v)) //确定itemMap的key结构顺序
    for (let firstKey of firstKey) {
        itemMap[firstKey].every(v => {
            const { firstCode, firstName, firstWeight,
                secondCode, secondName, secondWeight,
                thirdCode, thirdName, thirdWeight,
                itemDesc, itemWeight
            } = v
            const itemId = v.itemId + '_' //因为评分项id和一级维度id都是从1开始自增的，会重复，+'_'进行区分
            /**
             * child该维度下的直接子元素code集合
             * weight该维度的权重
             * emptyChildNum该维度下的直接子元素有几个是未填的（不包括<=0)
             */
            if (_.isNil(totalItemWMap[firstCode])) {
                if (firstWeight.toString() != '' && Number(firstWeight) <= 0) {
                    breakpoint = `一级维度 ${firstName} `
                    return false
                }
                firstKeyArr.push(firstCode)
                totalItemWMap[firstCode] = {
                    child: [],
                    weight: Number(firstWeight),
                    text: firstName,
                    emptyChildArr: [],
                    existWeight: 0,
                    level: 1
                }
                firstWeight.toString() === '' ? (totalItemWMap[firstCode].weight = '', firstEmptyArr.push(firstCode)) : firstExistWeight += Number(firstWeight)
            }
            if (_.isNil(totalItemWMap[secondCode])) {
                totalItemWMap[secondCode] = {
                    child: [],
                    weight: Number(secondWeight),
                    text: secondName,
                    emptyChildArr: [],
                    existWeight: 0,
                    level: 2
                }
                totalItemWMap[firstCode].child.push(secondCode)
                totalItemWMap[firstCode].existWeight += Number(secondWeight)
                if (secondWeight === '') {
                    CheckHasError('second') || totalItemWMap[firstCode].emptyChildArr.push(secondCode)
                    totalItemWMap[secondCode].weight = ''
                } else if (Number(secondWeight) <= 0 && !CheckHasError('second')) {
                    totalItemWMap[firstCode].errorChild = secondCode
                    errorChild.second = `二级维度 ${secondName} `
                    // return false
                }
            }
            if (_.isNil(totalItemWMap[thirdCode])) {
                totalItemWMap[thirdCode] = {
                    child: [],
                    weight: Number(thirdWeight),
                    text: thirdName,
                    emptyChildArr: [],
                    existWeight: 0,
                    level: 3
                }
                totalItemWMap[secondCode].child.push(thirdCode)
                totalItemWMap[secondCode].existWeight += Number(thirdWeight)
                if (thirdWeight === '') {
                    CheckHasError('third') || totalItemWMap[secondCode].emptyChildArr.push(thirdCode)
                    totalItemWMap[thirdCode].weight = ''
                } else if (Number(thirdWeight) <= 0 && !CheckHasError('third'))  {
                    totalItemWMap[secondCode].errorChild = thirdCode
                    errorChild.third = `三级维度 ${thirdName} `
                    // return false
                }
            }
            if (_.isNil(totalItemWMap[itemId])) {
                totalItemWMap[itemId] = {
                    child: null,
                    text: itemDesc,
                    weight: Number(itemWeight),
                    existWeight: 0,
                    level: 4
                }
                totalItemWMap[thirdCode].child.push(itemId)
                totalItemWMap[thirdCode].existWeight += Number(itemWeight)
                if (itemWeight === '') {
                    CheckHasError('item') || totalItemWMap[thirdCode].emptyChildArr.push(itemId)
                    totalItemWMap[itemId].weight = ''
                } else if (Number(itemWeight) <= 0 && !CheckHasError('item')) {
                    totalItemWMap[thirdCode].errorChild = itemId
                    errorChild.item = `评分项 ${itemDesc} `
                    // return false
                }
            }
            return true
        })
    }
    if (BreakPoint()) return
    /**
     * 计算每层的权重均分
     */
    const callAccWeight = (totalWeight, emptyArray, existWeight, level) => {
        const UnexistNum = emptyArray.length
        const mul = UnexistNum > 1 ? true : false;//有2个及以上空权重
        let surplusFirstL
        const surplusFirstI = accDiv(accSub(totalWeight, existWeight), UnexistNum) //一级均分每个权重-每个
        if (surplusFirstI <= 0) {
            breakpoint = `${level} ${totalItemWMap[emptyArray[0]].text} `;
            userOrAI = false;
            BreakPoint()
            return
        }
        mul && (surplusFirstL = accSub(totalWeight, accAdd(accMul(surplusFirstI, UnexistNum - 1), existWeight)))  //一级均分每个权重-最后一个
        if (mul && surplusFirstL <= 0) {
            breakpoint = `${level} ${totalItemWMap[emptyArray[UnexistNum - 1]].text} `;
            userOrAI = false;
            BreakPoint()
            return
        }
        emptyArray.forEach(v => {
            totalItemWMap[v].weight = surplusFirstI
        })
        surplusFirstL && (totalItemWMap[emptyArray[UnexistNum - 1]].weight = surplusFirstL)
        return true
    }
    if (firstEmptyArr.length) {
        //一级有空权重
        if (!callAccWeight(100, firstEmptyArr, firstExistWeight, '一级维度'))
            return
    }
    function* testing(referenceObj = [], text = "", createStorage) {
        let flag = referenceObj.some(v => {
            !_.isNil(createStorage) && (createStorage = createStorage.concat(totalItemWMap[v].child))
            if (totalItemWMap[v].emptyChildArr.length) {
                if (!callAccWeight(totalItemWMap[v].weight, totalItemWMap[v].emptyChildArr, totalItemWMap[v].existWeight, text))
                    return true
            }
            return false
        })
        if (createStorage) yield createStorage
        return flag
    }
    let beakError = false //均分完成了，但是有错(有权重小于等于0)
    
    /**
     * 二级检测
     */
    let secondTest = testing(firstKeyArr, '二级维度', [])
    let secondKeyArr = secondTest.next().value,thirdKeyArr
    beakError = secondTest.next().value
    if (!beakError && errorChild.second) {
        breakpoint = errorChild.second
        beakError = BreakPoint()
    }
    /**
     * 三级检测
    */
    if (!beakError) {
        let thirdTest = testing(secondKeyArr, '三级维度', [])
        thirdKeyArr = thirdTest.next().value
        beakError = thirdTest.next().value
        if (!beakError && errorChild.third) {
            breakpoint = errorChild.third
            beakError = BreakPoint()
        }
    }
    /**
     * 评分项检测
    */
    if (!beakError) {
        let itemTest = testing(thirdKeyArr, '评分项')
        if (!itemTest.next().value && errorChild.item) {
            breakpoint = errorChild.item
            beakError = BreakPoint()
        }
    }
    
    //totalItemWMap是均分完了再塞回去
    for (let firstKey in itemMap) {
        itemMap[firstKey] = itemMap[firstKey].map(v => {
            const { firstCode, secondCode, thirdCode
            } = v
            const itemId = v.itemId + '_'
            return {
                ...v,
                firstWeight: totalItemWMap[firstCode] ? totalItemWMap[firstCode].weight : '',
                secondWeight: totalItemWMap[secondCode] ? totalItemWMap[secondCode].weight : '',
                thirdWeight: totalItemWMap[thirdCode] ? totalItemWMap[thirdCode].weight : '',
                itemWeight: totalItemWMap[itemId] ? totalItemWMap[itemId].weight : '',
            }
        })
    }
    !beakError && message.success('均分完成，请查看！')
    return itemMap
} 
