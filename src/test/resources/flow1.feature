Feature: Fullflow

@Smoke @TEST_CASE_7
  Scenario: Run full flow
    * def result = call read('sample.feature@TEST_CASE_6')
    * print "given result of A is: $result"
    * def result = call read('sample.feature@TEST_CASE_2')
    * print "given result of A is: $result"