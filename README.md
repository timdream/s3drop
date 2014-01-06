# s3drop

A client-side web application for Amazom S3, as a personal file sharing space.

**Visit [the web app](http://timdream.org/s3drop/).** Permission is required to upload and list files.

## Introduction

The web app verifies who you are by talking to **Google** through **OAuth 2**. It gets Amazon S3 credentials from a private **Google Spreadsheet**. With the credentials, it gets the list of files in the bucket and upload files through the **S3 REST API** with **CORS**.

It also produces signed URLs for file downloads. Users could then send these URLs to people.

**Note:** this project started it's life as a simple file sharing with a PHP backend. If that still useful to you, please find the code at [the `php-backend`](https://github.com/timdream/s3drop/tree/php-backend) branch.

## Use cases

You most likely don't need to set this thing up. Commerical services such as [Dropbox](https://www.dropbox.com/) and/or [Google Drive](https://drive.google.com/) is capable of doing what most of this web app did. However, as these services are usually blocked in China, having a personal file sharing space can be handly *sometimes* if you work with people there.

The Amazon S3 Management Console can certainly do what this front-end do too, but it's UI is design for system administrators. It might be handly for you to set up this web app as the alternative simple UI for S3 file storage.

## Author & Copyright

Copyright 2014 [Timothy Guan-tin Chien](http://timdream.org/) and other contributors.
Released under [the MIT license](./MIT-LICENSE.txt).

## Libraries used

* [google-oauth2-web-client](https://github.com/timdream/google-oauth2-web-client) - Login with Google using OAuth2 for client-side web app. It features automatic login too.
* [CryptoJS](https://code.google.com/p/crypto-js/) for signing S3 API requests


## Acknowledgement

[&lt;i&gt; cloud](http://dabblet.com/gist/2945570) in CSS, design by @daneden.