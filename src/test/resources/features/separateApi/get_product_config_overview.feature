@ignore
Feature: Get A Product Configuration Overview

@Get_Product_Config_Overview
Scenario: Get A Product Configuration Overview
    Given path comOccPath,'ccpconfigurator',configId
    And params commonParams
    When method get
    * configure continueOnStepFailure = { enabled: true, continueAfter: false, keywords: ['match'] }
    Then status 200