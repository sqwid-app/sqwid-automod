const { CID } = require ('multiformats/cid');

module.exports = {
    getCIDv1: (url) => CID.parse(url.replace("ipfs://", "")).toV1().toString()
}