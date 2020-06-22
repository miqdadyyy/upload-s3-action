const core = require('@actions/core');
const AWS = require('aws-sdk');
const S3 = AWS.S3;
const fs = require('fs');
const path = require('path');
const shortid = require('shortid');
const klawSync = require('klaw-sync');
const {lookup} = require('mime-types');

const KEY_ID = core.getInput('s3_key_id', {
  required: true
});
const SECRET_ACCESS_KEY = core.getInput('s3_secret_access_key', {
  required: true
});
const BUCKET = core.getInput('s3_bucket', {
  required: true
});
const SOURCE_DIR = core.getInput('source_dir', {
  required: true
});
const REGION = core.getInput('s3_region', {
    required: true
});
const DESTINATION_DIR = core.getInput('destination_dir', {
    required: false
})
const PROVIDER = core.getInput('s3_host') || 'amazonaws.com';
const ENDPOINT = new AWS.Endpoint(`${REGION}.${PROVIDER}`);

const s3 = new S3({
    accessKeyId: KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
    endpoint: ENDPOINT,
});

const objKey = DESTINATION_DIR !== undefined ? DESTINATION_DIR : `${shortid()}/`;
const paths = klawSync(SOURCE_DIR, {
    nodir: true
});

function upload(params) {
    return new Promise(resolve => {
        s3.upload(params, (err, data) => {
            if (err) core.error(err);
            core.info(`uploaded - ${data.Key}`);
            core.info(`located - ${data.Location}`);
            resolve(data.Location);
        });
    });
}

function run() {
    return Promise.all(
        paths.map(p => {
            const Key = p.path.replace(path.join(process.cwd(), SOURCE_DIR, '/'), objKey);
            const fileStream = fs.createReadStream(p.path);
            const params = {
                Bucket: BUCKET,
                ACL: 'public-read',
                Body: fileStream,
                Key,
                ContentType: lookup(p.path) || 'text/plain'
            };
            return upload(params);
        })
    );
}

run()
    .then(locations => {
        core.info(`object key - ${objKey}`);
        core.info(`object locations - ${locations}`);
        core.setOutput('object_key', objKey);
        core.setOutput('object_locations', locations);
    })
    .catch(err => {
        core.error(err);
        core.setFailed(err.message);
    });
