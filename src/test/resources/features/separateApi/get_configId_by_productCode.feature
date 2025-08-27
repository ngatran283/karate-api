@ignore
Feature: Get Configuration Id

Background:
    * url 'http://localhost:3000'
    * headers {Accept: 'application/json',Authorization: 'Bearer '}
    
@Get_ConfigId_Of_Product_Code
Scenario: Get configuration Id of Product Code
    * def allParams = karate.merge({ cps: true}, { 'provideAllAttributes': true})
    Given path 'dv','products',productCode,'configurattors/ccpconfigurator'
    And params allParams
    When method get
    Then status 200
    And match response.data.configId == '#notnull'
    * def configId = response.data.configId
    * print 'created configId is: ', configId



