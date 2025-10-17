@ignore
Feature: Get Configuration Id

Background:
    * url comOccHostname
    * headers commonHeader
    
@Get_ConfigId_Of_Product_Code
Scenario: Get configuration Id of Product Code
    * def allParams = karate.merge({ cps: true}, { 'provideAllAttributes': true})
    Given path 'dv','products',productCode,'configurattors/configurator'
    And params allParams
    When method get
    Then status 200
    And match response.data.configId == '#notnull'
    * def configId = response.data.configId
    * print 'created configId is: ', configId



