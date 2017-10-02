/* eslint-env node */
'use strict';

const fs         = require('fs');
const path       = require('path');
var archiver     = require('archiver');
const BasePlugin = require('ember-cli-deploy-plugin');
const rimraf     = require('rimraf');
const RSVP       = require('rsvp');

module.exports = {
  name: 'ember-cli-deploy-fastboot-app-server',

  createDeployPlugin: function(options) {
    let DeployPlugin = BasePlugin.extend({
      name: options.name,

      defaultConfig: {
        fastbootArchivePrefix: 'dist-',

        distDir: function(context) {
          return context.distDir;
        },

        fastbootDistDir: 'tmp/fastboot-deploy',

        revisionKey: function(context) {
          let revisionKey = context.revisionData && context.revisionData.revisionKey;
          return context.commandOptions.revision || revisionKey;
        },

        fastbootDownloaderManifestContent: function() {
          return function(bucket, key) {
            return `
              {
                "bucket": "${bucket}",
                "key": "${key}"
              }
            `;
          };
        }
      },

      setup: function() {
        let fastbootArchivePrefix     = this.readConfig('fastbootArchivePrefix');
        let fastbootDownloaderManifestContent = this.readConfig('fastbootDownloaderManifestContent');

        return { fastbootDownloaderManifestContent, fastbootArchivePrefix };
      },

      willBuild: function() {
        let fastbootDistDir = this.readConfig('fastbootDistDir');

        rimraf.sync(fastbootDistDir);

        return RSVP.resolve();
      },

      didPrepare: function(context) {
        let distDir               = this.readConfig('distDir');
        let revisionKey           = this.readConfig('revisionKey');
        let fastbootDistDir       = this.readConfig('fastbootDistDir');
        let fastbootArchivePrefix = context.fastbootArchivePrefix;

        if (!fs.existsSync(fastbootDistDir)) {
          fs.mkdirSync(fastbootDistDir);
        }

        let archiveName = fastbootArchivePrefix+revisionKey+'.zip';
        let archivePath = path.join(fastbootDistDir, archiveName);

        let writeStream = fs.createWriteStream(archivePath);
        var archive = archiver('zip', {
          zlib: {
            level: 9
          }
        });
        archive.pipe(writeStream);
        archive.directory(distDir, 'dist');


        var promise = new RSVP.Promise(function(resolve, reject) {

          archive.finalize().then(function() {
            console.log('in finalize promise')

          });
          
          writeStream.on('close', function() {
              console.log('close calbbac')
              resolve({
                fastbootArchiveName: archiveName,
                fastbootArchivePath: archivePath
              });

          });

          archive.on('error', function(err) {
            reject(err);
          });

        });


        return promise;


      }
    });

    return new DeployPlugin();
  }
};
