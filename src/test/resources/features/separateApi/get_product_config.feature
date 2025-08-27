@ignore
Feature: Get A Product Configuration

@Get_Product_Config
Scenario: Get A Product Configuration
    Given path comOccPath,'ccpconfigurator',configId
    And params commonParams
    When method get
    Then status 200
    #And match karate.keysOf(response.data).length > 0