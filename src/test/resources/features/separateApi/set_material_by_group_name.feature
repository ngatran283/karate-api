@ignore
Feature: Set Material By Group Name


Background:
    * url 'http://localhost:3000'
    * headers {Accept: 'application/json',Authorization: 'Bearer '}
    
@Set_Material_By_Group_Name
Scenario: Set Material By Group Name
    Given path 'dv','ccpconfigurator',configId,groupName,'material',materialCode
    And params { cps: true}
    When method patch
    Then status 200
    * print 'grs:', groupName
    * print 'ma:', materialCode
    * print 'end:', configId
    #And match karate.keysOf(response.data).length > 0