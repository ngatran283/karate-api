Feature: Sample Karate Test

@Smoke @TEST_CASE_6
  Scenario: get detail config info
    Given url 'http://localhost:3000/config/info/12'
    When method get
    Then status 200

  @Smoke @TEST_CASE_2
  Scenario: get master config
    Given url 'http://localhost:3000/masters/config'
    When method get
    Then status 200