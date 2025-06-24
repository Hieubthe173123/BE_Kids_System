const Imap = require('imap');
const { parseHeader } = require('imap');

const appBizDebugger = require('debug')('app:biz');

const { simpleParser } = require('mailparser');
// const Excel = require('./excelHelper');
// import { createTransport } from 'nodemailer';

require('tls').DEFAULT_MIN_VERSION = 'TLSv1'; // fix NodeJS version >=12 prevent TLSv1.0

const reCheckMail = 5;

class IMAP_Helper {
  constructor(config) {
    this.config = config;
    this.imap = new Imap(config);
    this.reCheckMail = reCheckMail;
  }

  connect(onReadyCallback) {
    const { imap } = this;

    this.imap.once('ready', () => {
      appBizDebugger(`IMAP_Helper: Connection ready.`);

      onReadyCallback();
    });

    imap.once('error', (error) => {
      console.error(error);
      appBizDebugger(`IMAP_Helper error: ${error}`);
      onReadyCallback(error);
    });

    imap.once('end', () => {
      appBizDebugger('IMAP_Helper: Connection ended!');
    });

    imap.connect();
  };

  getState() {
    const { state } = this.imap;

    appBizDebugger(`IMAP_Helper getState: ${state}`);

    return state;
  }

  getBoxes(callback) {
    appBizDebugger(`IMAP_Helper getBoxes`);

    return this.imap.getBoxes(callback);
  }

  openBox(mailboxName, openReadOnly, callback) {
    appBizDebugger(`IMAP_Helper openBox: ${mailboxName}`);

    return this.imap.openBox(mailboxName, openReadOnly, callback);
  }

  search(criteria, callback) {
    return this.imap.search(criteria, callback);
  }

  fetch(source, options) {
    return this.imap.seq.fetch(source, options);
  }

  parseHeader(rawHeader, disableAutoDecode) {
    return parseHeader(rawHeader, disableAutoDecode)
  }

  readMail(folder, searchOptions, markSeen = false) {
    return new Promise((resolve, reject) => {
      this.connect((error) => {
        if (error) {
          reject(error)
        } else {
          this.imap.openBox(folder, false, (error, mailBox) => {
            if (error) {
              reject(error);
            }

            this.imap.search(searchOptions, async (error, uids) => {
              let messages = [];

              for (const uid of uids) {
                if (uid) {
                  const { message, readedMail } = await this.checkMail(uid, markSeen);
                  if (readedMail) {
                    messages.push(message);
                  } else {
                    break;
                  }
                }
              }

              this.disconnect();
              resolve(messages);
            })
          })
        }
      })
    })
  }

  readMailByUidList(folder, uids, markSeen = false) {
    return new Promise((resolve, reject) => {
      this.connect((error) => {
        if (error) {
          reject(error)
        } else {
          this.imap.openBox(folder, false, async (error, mailBox) => {
            if (error) {
              reject(error);
            }

            let messages = [];

            for (const uid of uids) {
              const message = await this.readMailByUid(uid, markSeen);
              messages.push(message);
            }

            this.disconnect();
            resolve(messages);
          })
        }
      })
    })
  }

  readMailByUid(uid, markSeen) {
    return new Promise((resolve, reject) => {
      const f = this.imap.fetch(uid, { bodies: "", markSeen });

      f.on('message', (msg) => {
        msg.on('body', stream => {
          simpleParser(stream, (error, parsed) => {
            if (error) {
              console.error(error);
              appBizDebugger(`IMAP_Helper error: ${error}`);
              reject(error);
            }
            parsed.uid = uid;
            resolve(parsed);
          })
        })
      })

      f.once('error', error => {
        reject(error);
      });

      f.once('end', () => {
        console.log('Done fetching message!');
      });
    })
  }

  closeBox() {
    return this.imap.closeBox();
  }

  disconnect() {
    this.imap.end();
  }

  async checkMail(uid, markSeen) {
    let count = 0;
    let readedMail = false;
    const reCheckMail = this.reCheckMail;
    let message;
    console.log(`------------------------------------------------------`);
    while (count < reCheckMail) {
      message = await this.readMailByUid(uid, false);

      const { attachments, subject } = message;
      if (attachments.length > 0) {
        let attachment = attachments.find(item => item.hasOwnProperty('filename') && item.filename.includes('.xlsx'));
        if (!attachment) {
          attachment = attachments[0];
        }
		
        const { filename, content } = attachment;
		if (!filename) {
		  count ++;
		  await new Promise(resolve => setTimeout(resolve, 5000));
		} else {
          if (filename.includes('.xlsx') && !filename.startsWith('Allocation')) {
            let excel = new Excel();
            try {
              await excel.load(content);
              await excel.getWorkbookInstant();
		  	  readedMail = true;
		  	  count = reCheckMail;
            } catch (err) {
              if (err.toString().includes('Corrupted zip: missing') && err.toString().includes('bytes.')) {
				count++;
		  	    await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          } else {
			count = reCheckMail;
			readedMail = true;
		  }
		}
      } else {
		count = reCheckMail;
		readedMail = true;
	  }
    }
    await this.readMailByUid(uid, markSeen);
    return { message, readedMail };
  }
};

module.exports = IMAP_Helper;

