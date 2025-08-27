@ignore
Feature: Set Material By Group Name

Background:
    * url comOccHostname
    * headers commonHeader
    
@Set_Material_By_Group_Name
Scenario: Set Material By Group Name
    Given path comOccPath,'ccpconfigurator',configId,groupName,'material',materialCode
    And params { cps: true}
    When method patch
    Then match responseStatus == 200
    * print 'Response Set Material By Group Name: ', configId, 'groupName', groupName,': ',response

