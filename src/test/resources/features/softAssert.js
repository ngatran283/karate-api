function SoftAssert() {
  var errors = [];

  return {
    assert: function(condition, message) {
      if (!condition) {
        errors.push(message);

        // Log for console visibility
        karate.log('Soft assert failed:', message);

        // Record failure so Karate sees it in summary
        try {
          karate.match('true', false, message); // deliberately fails
        } catch(e) {
          // ignore, continue execution
        }
      }
    },
    report: function() {
      if (errors.length > 0) {
        // Final failure at the end
        karate.fail('Soft assert failures:\n' + errors.join('\n'));
      }
    },
    getErrors: function() {
      return errors;
    }
  };
}
