Feature: Sample Karate Test

@Smoke @TEST_CASE_6
  Scenario: get detail config info
    Given url 'http://localhost:3000/config/info/12'
    When method get
    Then status 200
    And match response == {"id_config": "123543543653","info_1": "ok la"}

  @Smoke @TEST_CASE_2
  Scenario: get master config
    Given url 'http://localhost:3000/masters/config'
    When method get
    Then status 200