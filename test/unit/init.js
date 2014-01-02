'use strict';

jQuery(function () {
  module('Init');

  test('initialized', function () {
    ok(GetJSONSpy.calledOnce, '$.getJSON');

    var spyCall = GetJSONSpy.firstCall();

    GO2Mock.verify();
    ok(true, 'Passed!');
  });
});