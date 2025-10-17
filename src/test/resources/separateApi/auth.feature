@ignore
Feature: Get Auth Token

@Auth
Scenario: Authorization
    Given url 'http://localhost:3000'
    And headers { Accept: 'application/json', Content-Type : 'application/x-www-form-urlencoded'}
    And path '/dv/oauth/token', 
    And request { client_id: '2143', client_secret: 'dsg', grant_type:'client_credentials' }
    When method post
    Then status 200
    And match response.token == '#notnull'
    * def token = response.token

