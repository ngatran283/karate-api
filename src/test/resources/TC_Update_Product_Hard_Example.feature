Feature: Flow Update Product Configuration

    Background:
        * url comOccHostname
        * headers commonHeader
        * def softAssert = call read('softAssert.js')
        * def pc = karate.properties['productCode']
        * def sh = karate.properties['sheet']
        * if ((pc && productCode !== pc) || (sh && sheet !== sh)) {karate.log('SKIP_TESTCASE', productCode, ' ', sheet);karate.abort();}
        * def ExcelUtils = Java.type('ExcelUtils')
        * def filePath = karate.toAbsolutePath('payloads/'+productCode+'.xlsx')
        * def groups = ExcelUtils.readSheet(filePath,sheet)

    @Smoke @Update_All_Group_Of_Product1
    Scenario Outline: Update All Group of Product <productCode> <sheet>
        * def responseGetConfigIdOfProductCode = call read('/separateApi/get_configId_by_productCode.feature@Get_ConfigId_Of_Product_Code')
        * def results = []
            And configure continueOnStepFailure = { enabled: true, continueAfter: true, keywords: ['match', 'status'] }
                * eval
                """
                karate.forEach(groups, function(group){
                karate.log('Current group:', group);
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
                for (var i = 0; i < results.length; i++) {
                karate.log('Current run i:', results[i]);
                softAssert.assert(results[i].response&&results[i].response.data&&results[i].response.data.consistent&&results[i].response.data.consistent == true, 'Fail Step '+results[i].testStepName+ '--Data- Group Name:'+results[i].args.groupName+' Material Code'+results[i].args.materialCode)
                }
                """
                * eval softAssert.report()
                * configure continueOnStepFailure = false


    Examples:
        | productCode | sheet |
        | MOMO        | Hallo |
        | MOMO        | World |
        | MOCHI       | Hallo |
        | MOCHI       | World |