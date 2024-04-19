export interface mdlServiceResponseRec<T> {
  error: boolean,
  exception : {
    message: string
    errorcode: string
    backtrace: string
    link: string
    moreinfourl: string
    debuginfo: string
  },
  data: Array<T>
}
/* error e.g.
{
    "error": true,
    "exception": {
        "message": "Exception - Undefined constant \"local_gcs\\local\\codeset\"",
        "errorcode": "generalexceptionmessage",
        "backtrace": "* line 62 of /local/gcs/classes/local/data.php: Error thrown\n* line 72 of /local/gcs/classes/external/codes_get.php: call to local_gcs\\local\\data::get_codes()\n* line 261 of /lib/externallib.php: call to local_gcs\\external\\codes_get::execute()\n* line 81 of /lib/ajax/service.php: call to external_api::call_external_function()\n",
        "link": "https://dev.gcs.edu/local/gcs/codes.php",
        "moreinfourl": "http://docs.moodle.org/401/en_us/error/moodle/generalexceptionmessage",
        "debuginfo": "\nError code: generalexceptionmessage"
    }
}
*/
