Feature: Flow Update Product Configuration

Background:
    * url 'http://localhost:3000'
    * headers {Accept: 'application/json',Authorization: 'Bearer '}

    @Smoke @Update_All_Group_Of_Product1
    Scenario Outline: Update All Group of Product <productCode> <sheet>
        * def softAssert = call read('softAssert.js')
        * def groupse = read('payloads/' + productCode + '.xlsx')
        * def responseGetConfigIdOfProductCode = call read('/separateApi/get_configId_by_productCode.feature@Get_ConfigId_Of_Product_Code')
        * def groups = [{ groupName: 'GroupA', materialCode: 'M001'},{ groupName: 'GroupB', materialCode: 'M002'}]
        * print 'Groups:', groups
        * def results = []
        * eval
        """
        karate.forEach(groups, function(group){
            karate.log('Current group:', group);
            var args = {
                configId: 'm',
                groupName: group.groupName,
                materialCode: group.materialCode
            };
            karate.log('Current vars:', args);
            var res = karate.call('classpath:features/separateApi/set_material_by_group_name.feature@Set_Material_By_Group_Name', args);
            results.push({response:res.response,args:args});
        });
        """
        * eval
        """
        for (var i = 0; i < results.length; i++) {
            softAssert.assert(results[i].response.data.consistent == false, 'Fail - group name:'+results[i].args.groupName+' material code'+results[i].args.materialCode)
        }
        """
        * eval softAssert.report()

    Examples:
    | productCode    | sheet |
    | HANSET4_MONOBLC| 1   |
    | HANSET4_MONOBLC| 2   |