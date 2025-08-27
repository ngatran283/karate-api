@ignore
Feature: Delete Material In Group

Background:
    * url comOccHostname
    * headers commonHeader
    
@Delete_Material_In_Group
Scenario: Delete Material In Group
    And path comOccPath,'ccpconfigurator',configId,'groups',groupName,'delete/material'
    And headers commonHeader
    And params commonParams
    When method put
    Then status 200