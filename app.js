const yargs = require('yargs')
const inventory = require('./inventory')
const [inputParam = ''] = yargs.argv._ || [] - Done
const SHIPPING_CHARGES = 400 // Shipping Cost
const DISCOUNT_PERCENTAGE_MULTIPLIER = .20 // 20%

const COUNTRY_REGEX_HASH = {
    UK: /^B[1-9]{3}[A-Za-z]{2}[1-7]{7}/,
    Germany: /^A[A-Za-z]{2}[A-Za-z1-7]{7}/
}

const getSourceCountry = passport => {
    if (COUNTRY_REGEX_HASH.UK.test(passport)) return 'UK'
    if (COUNTRY_REGEX_HASH.Germany.test(passport)) return 'Germany'
    return null
}

const parseDemand = demand => {
    const obj = {}
    demand.map((item, index) => {
        if (!parseInt(item)) {
            obj[item] = parseInt(demand[index + 1])
        }
    })
    return obj
}

const calculateShippingCost = ({ numberOfItems, discount }) => {
    const charges = SHIPPING_CHARGES * (Math.ceil(numberOfItems / 10) )
    return discount ? charges - charges * DISCOUNT_PERCENTAGE_MULTIPLIER : charges
}

const calculatePrice = ({ country, type, result, value }) => {
    const otherCountry = country === 'UK' ? 'Germany' : country
    const currentCountryInventory = inventory[country]
    const otherCountryInventory = inventory[otherCountry]
    var price = 0, shippingItems = 0
    
    if (currentCountryInventory[type].stock >= value) {
        price += currentCountryInventory[type].price * value
        if (country === 'UK') {
            result.push(inventory.UK[type].stock - value)
            result.push(inventory.Germany[type].stock)
        } else {
            result.push(inventory.UK[type].stock)
            result.push(inventory.Germany[type].stock - value)
        }
    } else {
        price += currentCountryInventory[type].price * currentCountryInventory[type].stock
        price += otherCountryInventory[type].price * (value - currentCountryInventory[type].stock)
        shippingItems += (value - currentCountryInventory[type].stock)
        if (country === 'UK') {
            result.push(0)
            result.push(value - currentCountryInventory[type].stock)
        } else {
            result.push(value - currentCountryInventory[type].stock)
            result.push(0)
        }
    }
    return { price, result, shippingItems }
}

const generateOrder = ({ country, sourceCountry, demand = {} }) => {
    var result = []
    result.push(0)
    var price = 0
    var shippingItems = 0
    const { Mask, Gloves } = demand

    if (Mask > (inventory.UK.Mask.stock + inventory.Germany.Mask.stock) || Gloves > (inventory.UK.Gloves.stock + inventory.Germany.Gloves.stock)) {
        result[0] = 'OUT_OF_STOCK'
        result.push(inventory.UK.Mask.stock)
        result.push(inventory.Germany.Mask.stock)
        result.push(inventory.UK.Gloves.stock)
        result.push(inventory.Germany.Gloves.stock)
        return result.join(':')
    }
    const { price: MaskPrice, result: response, shippingItems: MaskShipItems } = calculatePrice({ country, result, type: 'Mask', value: Mask })
        price += MaskPrice 
        shippingItems += MaskShipItems
        result = response
    const { price: GlovesPrice, result: GlovesArray, shippingItems: GlovesShipItems } = calculatePrice({ country, result, type: 'Gloves', value: Gloves })
        price += GlovesPrice 
        shippingItems += GlovesShipItems
        result = response
    price += shippingItems ? calculateShippingCost({ numberOfItems: shippingItems, discount: sourceCountry && country !== sourceCountry}) : 0
    result[0] = price
    return result.join(':')
}

if (inputParam) {
    const inputParamArray = inputParam.split(':')
    const [country, passport, ...rest] = inputParamArray
    const sourceCountry = getSourceCountry(passport)
    const demand = sourceCountry ? rest : inputParamArray.splice(1, 4)
    const result = generateOrder({ country, sourceCountry, demand: parseDemand(demand) })
    console.log(result)
} else {
    console.log('Invalid Input, try with - node app UK:B123AB1234567:Gloves:20:Mask:10')
}