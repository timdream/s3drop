'use strict';

jQuery(function() {
  $('#no-script').hide();

  $('input').on('input', function(evt) {
    if (this.id in CalculateOutput) {
      CalculateOutput[this.id].call(this);
    }
    CalculateOutput.__default.call(this);
  }).trigger('input');

  $('button').on('click', function(evt) {
    var $output = $('output[for="' + this.id + '"]');
    Tests[this.id]($output);
  });
});

var CalculateOutput = {
  'url': function urlOutput() {
    var a = document.createElement('a');
    a.href = this.value;

    var origin = a.protocol + '//' + a.host;
    $('output[for="origin"]').text(origin);
  },

  '__default': function defaultOutput() {
    $('output[for="' + this.id + '"]').text(this.value);
  }
};

var Tests = {
  'aws-test': function doAWSTest($output) {
    var api = new DropAPI();
    api.awsConfig = {
      bucketName: $('#bucket-name').val(),
      accessKeyId: $('#access-key-id').val(),
      secretAccessKey: $('#secret-access-key').val(),
      protocol: 'https'
    };

    $output.append($('<p />').text('Running...'));

    api.listFiles(function(result, errorInfo) {
      if (errorInfo) {
        $output.append($('<p />')
          .text('Server error: ' + errorInfo.code + ':' + errorInfo.message));
      }
      if (!result) {
        $output.append($('<p />').text('Error getting result.'));
      } else {
        $output.append($('<p />').text('Got a list of ' + result.length + ' file(s).'));
      }
    });
  },

  'go2-test': function doGO2Test($output) {
    var url = $('#url').val();
    var go2 = new GO2({
      clientId: $('#google-client-id').val(),
      redirectUri: url,
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://spreadsheets.google.com/feeds/']
    });

    if (window.location.href.substr(0, url.length) !== url) {
      alert('This only works if you open this page on the intended domain.');

      return;
    }

    $output.append($('<p />').text('Running...'));

    go2.login();
    go2.onlogin = function loggedIn(token) {
      $output.append($('<p />').text('Received Google OAuth 2 token: ' + token));
      go2.destory();
    };
  },

  'spreadsheet-test': function doGO2Test($output) {
    var url = $('#url').val();
    var go2 = new GO2({
      clientId: $('#google-client-id').val(),
      redirectUri: url,
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://spreadsheets.google.com/feeds/']
    });
    if (window.location.href.substr(0, url.length) !== url) {
      alert('This only works if you open this page on the intended domain.');

      return;
    }

    var api = new DropAPI();
    api.spreadsheetKey = $('#spreadsheet-key').val();

    $output.append($('<p />').text('Running...'));

    go2.login();
    go2.onlogin = function loggedIn(token) {
      $output.append($('<p />').text('Received Google OAuth 2 token: ' + token));
      api.accessToken = token;

      api.getConfig(function gotConfig(hasAccess) {
        if (!hasAccess) {
          $output.append($('<p />').text('Error: no access to the spreadsheet.'));
          go2.destory();

          return;
        }

        var config = {
          bucketName: $('#bucket-name').val(),
          accessKeyId: $('#access-key-id').val(),
          secretAccessKey: $('#secret-access-key').val(),
          protocol: 'https'
        };

        ['bucketName', 'accessKeyId', 'secretAccessKey', 'protocol'].forEach(function (key) {
          if (api.awsConfig[key] !== config[key]) {
            $output.append($('<p />').text('Error: Value of ' + key + ' is inconsistent with record here: ' + api.awsConfig[key]));
          } else {
            $output.append($('<p />').text('Received value of ' + key + ': ' + api.awsConfig[key]));
          }
        }.bind(this));
      });

      go2.destory();
    };
  },

  'vars-test': function doGO2Test($output) {
    $output.append($('<p />').text('Running...'));

    var w = new Worker('./assets/install-vars-worker.js');
    w.onmessage = function(evt) {
      var data = evt.data;
      $output.append($('<p />').text('GOOGLE_OAUTH2_CLIENT_ID: ' +
        (data.GOOGLE_OAUTH2_CLIENT_ID === $('#google-client-id').val())));

      $output.append($('<p />').text('GOOGLE_SPREADSHEET_KEY: ' +
        (data.GOOGLE_SPREADSHEET_KEY === $('#spreadsheet-key').val())));

      $output.append($('<p />').text('LINK_EXPIRES_IN: ' +
        (data.LINK_EXPIRES_IN === 60 * 60 * 24 * 7)));

      $output.append($('<p />').text('Done.'));
    };
    w.onerror = function(evt) {
      console.log(evt);
      $output.append($('<p />').text('Error: ' + evt.message));
    };
  }
};
