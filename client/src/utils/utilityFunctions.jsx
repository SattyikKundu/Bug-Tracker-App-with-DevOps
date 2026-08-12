/****************************************************************************************************/
/********************** Utility Toast Success/Error functions ***************************************/
/****************************************************************************************************/

import toast from 'react-hot-toast';

/* NOTE: If passing a 'prop' from an old page to trigger a toast on the new page (via redirect),
 *       this can lead to an issue where the it looks like there 2 simultaneous overlapping props.
 */
export const SuccessMessageToast = (message, time=2300, place='top-center') => { // toast for returned success message
    toast.success(message, {
        style: { // general style of toast message
            borderRadius: '10px',             // rounded message corners
            background: '#fff',             // white background
            //border: '1px solid black',      // black border
            border: '1px solid #02c01b',    // darker green border
            color: '#00ce1b',               // lighter green text
            fontFamily: 'Arial',              // font-family of notification text
            fontWeight: 'Bold',               // font text bolded
            maxWidth: '400px',                // max toast width
            width: '100%',                    // ensures toast width fits message
            minHeight: '60px',                // minimum height of toast
            fontSize: '25px',                 // font size of text
            textAlign: 'center',              // centers text
            justifyContent: 'center'          // centers the contents vertically/horizontally
        },
        duration: time,    // toast lasts 2.3 seconds
        position: place    // place in general top-center area
    });
}

export const ErrorMessageToast = (error, time=2300, place='top-center') => { // toast for returned error message
    toast.error(error, {
        style: { // general style of toast message
            borderRadius: '10px',             // rounded message corners
            background: '#fff',             // white background
            //border: '1px solid black',      // black border
            border: '1px solid #d80000',    // lighter red text
            color: '#ca0000',               // darker red text
            fontFamily: 'Arial',              // font-family of notification text
            fontWeight: 'Bold',               // font text bolded
            maxWidth: '400px',                // max toast width
            width: '100%',                    // ensures toast width fits message
            minHeight: '60px',                // minimum height of toast
            fontSize: '25px',                 // font size of text
            textAlign: 'center',              // centers text
            justifyContent: 'center'          // centers the contents vertically/horizontally
        },
        duration: time,  // toast lasts 2.3 second
        position: place  // place in general top-center area
    });
}

export const NeutralMessageToast = (message, time=2300, place='top-center') => { // toast for informational purposes mainly
    toast(message, {
        style: { // general style of toast message
            borderRadius: '10px',             // rounded message corners
            background: '#fff',             // white background
            //border: '1px solid black',      // black border
            border: '1px solid #444242',    // darker grey border
            color: '#535353',               // lighter grey
            fontFamily: 'Arial',              // font-family of notification text
            fontWeight: 'Bold',               // font text bolded
            maxWidth: '400px',                // max toast width
            width: '100%',                    // ensures toast width fits message
            minHeight: '60px',                // minimum height of toast
            fontSize: '25px',                 // font size of text
            textAlign: 'center',              // centers text
            justifyContent: 'center'          // centers the contents vertically/horizontally
        },
        duration: time,  // toast lasts 2.3 second
        position: place  // place in general top-center area
    });
}


/* NOTE: It's possible to create a custom toast with unique features like an 'x' button to   
 *       manually delete the toast (if toast is persisting too long.). Consider creating a
 *       custom toast with this feature later. Basic outline example:
 * 
 *       import React from 'react'; // if using react components in custom version
 * 
 *       export const functionName = (message, time, place) => {
 *           toast.custom(
 *              (t) => { // Custom React code and style for custom toast },
 *                      { duration: time, position: place }
 *           );
 *       };        
 */



/* Converts a Unix timestamp in milliseconds (BIGINT) to a Month-Day-Year format.
 * Example output: "1-15-2012"
 *
 * param   {number} timestampMs - The Unix timestamp in milliseconds.
 * returns {string}             - The formatted date as "M-D-YYYY".
 */
// export function formatTimestampToMDY(timestampMs) {
//   if (!timestampMs) return ""; // Handle undefined/null case

//   const date = new Date(Number(timestampMs)); // convert string input into number first!
//                                               // Then push it into a Date() object

//   const month = date.getMonth() + 1;  // JavaScript months start at 0
//   const day = date.getDate();
//   const year = date.getFullYear();

//   return `${month}-${day}-${year}`;
// }

/* Alternative function that converts a Unix timestamp in milliseconds (BIGINT) to a Month Day, Year format.
 * Example output: "June 15, 2012"
 *
 * param   {number} timestampMs - The Unix timestamp in milliseconds.
 * returns {string}             - The formatted date as "Month Day, Year".
 */

// export function formatTimestampToLongDate(timestampMs) {
//   if (!timestampMs) return ""; // Handle undefined/null case

//   const date = new Date(Number(timestampMs));
//   // Example output: June 25, 2016
//   return date.toLocaleDateString('en-US', {
//     year: 'numeric',
//     month: 'long',
//     day: 'numeric'
//   });
// }

