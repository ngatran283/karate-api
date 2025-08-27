@ignore
Feature: Get A Product Configuration Overview

Background:
    * url comOccHostname
    * headers commonHeader
    
@Get_Product_Config_Overview
Scenario: Get A Product Configuration Overview
    Given path comOccPath,'ccpconfigurator',configId
    And params commonParams
    When method get
    Then status 200