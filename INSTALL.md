# s3drop installation helper

This document contains instructions and live tests for you to set the service up.

<div id="no-script">

<p><strong>Note: This page will be interactive if you open it from the location you intend to host. It's currently static.</strong></p>

</div>

## Prerequisite

1. Choose a Amazon S3 bucket name: <input id="bucket-name" value="my-bucket">

   Do not contain any dot (`.`) to avoid HTTPS error.

2. Host the pages somewhere on the web: <input id="url" size="40" type="url" value="https://mywebsite.com/s3drop/">

   Serve the pages over HTTPS is preferable (e.g. another bucket) to ensure better security and privacy.

3. The origin of the webpage will be: <code><output for="origin">https://mywebsite.com</output></code> (without trailing slash)

## Amazon S3 and IAM configuration

1. Go to [S3 Management Console](https://console.aws.amazon.com/s3/home)
2. Create a bucket with the name <code><output for="bucket-name">&lt;bucket-name&gt;</output></code>
3. Paste the following CORS Configuration

   <pre>&lt;?xml version="1.0" encoding="UTF-8"?&gt;
  &lt;CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"&gt;
    &lt;CORSRule&gt;
        &lt;AllowedOrigin&gt;<output for="origin">https://mywebsite.com</output>&lt;/AllowedOrigin&gt;
        &lt;AllowedMethod&gt;GET&lt;/AllowedMethod&gt;
        &lt;AllowedMethod&gt;PUT&lt;/AllowedMethod&gt;
        &lt;AllowedMethod&gt;POST&lt;/AllowedMethod&gt;
        &lt;AllowedMethod&gt;DELETE&lt;/AllowedMethod&gt;
        &lt;AllowedHeader&gt;*&lt;/AllowedHeader&gt;
        &lt;ExposeHeader&gt;Date&lt;/ExposeHeader&gt;
    &lt;/CORSRule&gt;
  &lt;/CORSConfiguration&gt;
  </pre>

4. Go to [IAM Management Console](https://console.aws.amazon.com/iam/home)
5. Create a group for the bucket, with the following policy allowing all access to the S3 bucket

   <pre>{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "AllowAccessToBucket",
        "Effect": "Allow",
        "Action": [
          "s3:*"
        ],
        "Resource": [
          "arn:aws:s3:::<output for="bucket-name">&lt;bucket-name&gt;</output>",
          "arn:aws:s3:::<output for="bucket-name">&lt;bucket-name&gt;</output>/*"
        ]
      }
    ]
}</pre>

6. Create an user and add the user to the group
7. Copy it's `Access Key Id` and `Secret Access Key` here:

	*  Access Key Id: <input id="access-key-id" value="&lt;access-key-id&gt;" size="20">
	*  Secret Access Key: <input id="secret-access-key" value="&lt;secret-access-key&gt;" size="40">

8. Test Amazon S3 access now (will result a few billed requests): <button id="aws-test">test</button>

    <output for="aws-test"></output>

## Google OAuth2 Client

1. Go to [Google Cloud Console](https://cloud.google.com/console) and create a project.
2. Go to `APIs & auth` > `Credentials` and click `Create New Client ID`, and create a Client ID according to information below:

   **Application type:**
   Web application

   **Authorized Javascript origins:**
   <code><output for="origin">https://mywebsite.com</output></code>

   **Authorized redirect URI:**
   <code><output for="url">https://mywebsite.com/drop/</output></code>

3. Copy the Client ID here (we don't need any other information here):

   <input id="google-client-id" size="60" value="&lt;google-client-id&gt;">

4. Test OAuth2 access now: <button id="go2-test">test</button>

    <output for="go2-test"></output>

## Google Spreadsheet

1. Create a spreadsheet with the following template


   |        | A                   | B
   | ------ |:--------------------| :---------------------------
   | **1**  | **bucketName**      | <code><output for="bucket-name">&lt;bucket-name&gt;</output></code>
   | **2**  | **accessKeyId**     | <code><output for="access-key-id">&lt;access-key-id&gt;</output></code>
   | **3**  | **secretAccessKey** | <code><output for="secret-access-key">&lt;secret-access-key&gt;</output></code>
   | **4**  | **protocol**        | `https`

   The labels in **A** column is simply for human-identifying purposes.
   You may not change the order of the rows.
   You could change the protocol to `http` to reduce security of the download links (not recommended).
2. Share the document to whoever you wish to have the access to the S3 bucket to (upload/delete files). However, they are safely to ignore the file and preceed to the web page directly.

   **Important:** If you remove someone from the shared list in the future, you should also refresh the IAM user credentials in IAM Management Console, and update them to the spreadsheet.

3. Copy the key of the spreadsheet here: <input id="spreadsheet-key" size="60" value="&lt;spreadsheet-key&gt;">

   It's the letters between `key=` and `&` in the URL of the "Share" dialog.

4. Test access to the spreadsheet now: <button id="spreadsheet-test">test</button>

    <output for="spreadsheet-test"></output>

## Site Settings

1. Create [`vars.js`](./assets/vars.js) based on the template of [`vars-sample.js`](./assets/vars-sample.js), or, simply copy the information gathered below:

   <pre>
   var GOOGLE_OAUTH2_CLIENT_ID = '<output for="google-client-id">&lt;google-client-id&gt;</output>';
   var GOOGLE_SPREADSHEET_KEY = '<output for="spreadsheet-key">&lt;spreadsheet-key&gt;</output>';
   var LINK_EXPIRES_IN = 60 * 60 * 24 * 7; // 1 week
   </pre>

2. Upload it to the hosting.
3. Test the existence of the file now: <button id="vars-test">test</button>

    <output for="vars-test"></output>
