@ignore
Feature: Set Filter By Group Name

Background:
    * url 'http://localhost:3000'
    * headers {Accept: 'application/json',Authorization: 'Bearer '}
    
@Set_Filter_By_Group_Name
Scenario: Set Filter By Group Name
    * def allParams = karate.merge(commonParams, { 'filterName': 'F_CATEGORY', 'productCode':productCode, 'filterValue':625720})
    Given path comOccPath,'ccpconfigurator',configId,groupName,'filter'
    And params allParams
    When method patch
    Then status 200
    #And match karate.keysOf(response.data).length > 0