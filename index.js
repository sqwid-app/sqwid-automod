require ( 'console-stamp' ) ( console );
const { testnet, mainnet } = require ('./lib/firebase');
const Rekognition = require ('@sqwid/rekognition');
const { getCloudflareURL, getDwebURL, getInfuraURL } = require('./lib/getIPFSURL');
const { default: axios } = require('axios');
const { FieldValue } = require ('firebase-admin').firestore;
const testnetQuery = testnet.collection ('collectibles').where ('approved', '==', null);
const mainnetQuery = mainnet.collection ('collectibles').where ('approved', '==', null);
const { setTimeout } = require ('timers/promises');
const rekognition = new Rekognition ({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: 'eu-central-1',
    MinConfidence: 75
});

let currentDocs = [];

const bannedLabels = [
    'Graphic Female Nudity',
    'Graphic Male Nudity',
    'Sexual Activity',
    'Explicit Nudity',
    'Adult Toys',
    'Graphic Violence Or Gore',
    'Nazi Party',
    'White Supremacy',
    'Extremist'
]

const constructLabels = (array) => {
    let obj = {};
    array.forEach (item => {
        if (item.Name in obj) {
            if (obj [item.Name].confidence < item.Confidence) obj [item.name].confidence = item.Confidence;
            
        } else obj [item.Name] = {
            confidence: item.Confidence
        }
    });
    return obj;
}

const approveDoc = async (doc) => {
    const { collectionId, id } = doc.data ();
    let updateItem = doc.ref.update ({
        approved: true
    });

    let allowItem = doc.ref.firestore.collection ('blacklists').doc ('collectibles').update ({
        allowed: FieldValue.arrayUnion ({
            id,
            collection: collectionId
        })
    });

    await Promise.all ([updateItem, allowItem]);
    console.log ('approved', doc.id, doc.ref.firestore.projectId);
}

const declineDoc = async (doc, reason) => {
    await doc.ref.update ({
        approved: false
    });
    if (reason) console.log (doc.id, reason);
}

const checkLabels = async (doc, labels) => {
    if (Object.keys (labels).length > 0) {
        let banned = false;
        for (const label in labels) {
            if (bannedLabels.includes (label)) {
                await declineDoc (doc, `${label} is banned`);
                banned = true;
                break;
            }
        }
        if (!banned) {
            await approveDoc (doc);
        }
    } else {
        await approveDoc (doc);
    }
}

const doCheckDocs = async () => {
    for (const doc of currentDocs) {
        console.log ('checking', doc.id, doc.data ().id);
        const meta = doc.data ().meta;
        const image = getInfuraURL (meta.image);
        const media = meta.image !== meta.media ? getDwebURL (meta.media) : getInfuraURL (meta.media);
        const mime = meta.mimetype;
        const actualType = await axios.head (media);
        await setTimeout (1000);
        if (actualType.headers['content-type'] !== mime) {
            await declineDoc (doc, `wrong mimetype, expected ${mime}, got ${actualType.headers['content-type']}`);
        } else {
            if (meta.image !== meta.media) {
                const resultImagePromise = rekognition.detectExplicitContent ({
                    url: image,
                    config: {
                        resize: { width: 1024 }
                    }
                });
                const resultMediaPromise = rekognition.detectExplicitContent ({
                    url: media
                });

                const [imageResult, mediaResult] = await Promise.all ([resultImagePromise, resultMediaPromise]);
                const allLabels = [...imageResult.ModerationLabels, ...mediaResult.ModerationLabels];
                const labels = constructLabels (allLabels);
                await checkLabels (doc, labels);
            } else {
                try {
                    const resultImage = await rekognition.detectExplicitContent ({
                        url: image,
                        config: {
                            resize: { width: 1024 }
                        }
                    });
                    const labels = constructLabels (resultImage.ModerationLabels);
                    await checkLabels (doc, labels);
                } catch (e) {
                    console.log (e);
                }
            }
        }
        await setTimeout (2000);
    }
    currentDocs = []
    await setTimeout (2000);
    doCheckDocs ();
}

doCheckDocs ();

const testnetObserver = testnetQuery.onSnapshot (async snapshot => {
    snapshot.docs.forEach (async doc => {
        if (currentDocs.find (docu => docu.id === doc.id)) {
            return;
        } else {
            currentDocs.push (doc);
        }
    });
}, err => {
    console.log ('err', err);
});

const mainnetObserver = mainnetQuery.onSnapshot (async snapshot => {
    snapshot.docs.forEach (async doc => {
        if (currentDocs.find (docu => docu.id === doc.id)) {
            return;
        } else {
            currentDocs.push (doc);
        }
    });
}, err => {
    console.log ('err', err);
});
