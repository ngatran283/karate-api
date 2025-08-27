@ignore
Feature: Reset a Product Configuration

Background:
    * url comOccHostname
    * headers commonHeader
    
@Reset_Product_Config
Scenario: Reset a Product Configuration
    * def allParams = karate.merge(commonParams, { 'productCode': productCode})
    Given path comOccPath,'ccpconfigurator',configId
    And params allParams
    When method put
    Then status 200
    #And match karate.keysOf(response.data).length > 0