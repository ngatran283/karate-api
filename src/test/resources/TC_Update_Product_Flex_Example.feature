Feature: Flow Update Product Configuration

    Background:
        * url comOccHostname
        * headers commonHeader
        * def softAssert = call read('softAssert.js')
        * def pc = karate.properties['productCode']
        * def sh = karate.properties['sheet']
        * if ((pc && productCode !== pc) || (sh && sheet !== sh)) {karate.log('SKIP_TESTCASE');karate.abort();}
        * def ExcelUtils = Java.type('ExcelUtils')
        * def filePath = karate.toAbsolutePath('payloads/'+productCode+'.xlsx')
        * def groups = ExcelUtils.readSheet(filePath,sheet)

    @setup
    Scenario: setup_data
    * def product = read('payloads/product.csv')

    @Smoke @Update_All_Group_Of_Product2
    Scenario Outline: Update All Group of Product <productCode> <sheet>
        * def responseGetConfigIdOfProductCode = call read('/separateApi/get_configId_by_productCode.feature@Get_ConfigId_Of_Product_Code')
        * def results = []
                * eval
                """
                karate.forEach(groups, function(group){
                var args = {
                configId: responseGetConfigIdOfProductCode.response.data.configId,
                groupName: group.groupName,
                materialCode: group.materialCode
                };
                karate.log('Current vars:', args);
                var res = softAssert.safeCall('classpath:separateApi/set_material_by_group_name.feature@Set_Material_By_Group_Name', args)
                results.push({response:res.response,args:args,testStepName:'Set_Material_By_Group_Name'});
                });
                """
                * eval
                """
                karate.forEach(results, function(result, index){
                var log = result.response&&result.response.data?', not found field data.consistent':', response code not 200'
                softAssert.assert(result.response&&result.response.data&&result.response.data.consistent&&result.response.data.consistent == true, 'Fail Step '+result.testStepName+ '--Data-Row: ' + (index+1) +'   Group Name:'+result.args.groupName+' Material Code'+result.args.materialCode +log)
                });
                """
                * eval softAssert.report()

    Examples:
        | karate.setup().product |