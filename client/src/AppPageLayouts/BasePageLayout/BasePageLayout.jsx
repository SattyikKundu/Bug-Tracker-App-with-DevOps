import { useState, useEffect } from "react"; // import React library
//import { Toaster, toast, useToasterStore } from 'react-hot-toast'; // enable toast messaages to open in all app 
                                                                   // routes within this layout. Without <Toaster />,
                                                                   // toast messages will silently fail and won't show

//import Menu from "../../PageComponents/menu/menu";
//import CartSlider from "../../PageComponents/cartSlider/cartSlider";
import { Outlet } from "react-router-dom";

import './BasePageLayout.css';

/* <BasePageLayout> serves as a "wrapper" that provides 
 * the necessary common functions & features like Toasts messages, 
 * header menu, and the cart slider to BOTH <PublicPageLayout> 
 * and the <ProtectedPageLayout>. For there, any specializations
 * for the respective page layout can then be added.
 */


const BasePageLayout = () => {

    //const [cartSliderOpen, setCartSliderOpen] = useState(false); // tracks when cart slider opens

    // const toggleCart = () => { // toggles opening and closing of the cart slider
    //     setCartSliderOpen(prev => !prev); 
    // }

    // const { toasts } = useToasterStore(); // used to manage toast State
    // const TOAST_LIMIT = 1;                // Limits to 1 toast per sandwich

    // useEffect(() => { // useEffect() that dismisses last toast when added new toast exceeds TOAST_LIMIT.
    //                   // essentially prevent too many toasts to 'sandiwich' due to rapid clicks.
    //     toasts
    //         .filter((selectedToast) => selectedToast.visible)           // Only consider visible toasts
    //         .filter((_, index) => index >= TOAST_LIMIT)                 // Is toast index over limit?
    //         .forEach((currentToast) => toast.dismiss(currentToast.id)); // Dismiss
    // }, [toasts]);



    useEffect(() => {
        // Step 1: Get computed styles of root element (which refers to :root{..} where
        //         varaiables are defined (:root is a selector which point to top-most element(<html>))
        const rootStyles = getComputedStyle(document.documentElement);

        // Step 2: Retrieve the background image and size from CSS variables
        const image = rootStyles.getPropertyValue('--background-image');
        const size  = rootStyles.getPropertyValue('--background-img-size');

        // Step 3: Select ALL DOM elements that are marked to repaint background styles
        const elements = document.querySelectorAll('[data-bg-var-repaint]');

        // Step 4: For each matching element, manually reapply the background image and size
        elements.forEach((element) => {
            element.style.backgroundImage = image;  // Re-apply the image (forces repaint)
            element.style.backgroundSize  = size;   // Re=apply the size to ensure consistency
        });
    }, []);

    return (
        <>
        <div className="app-body">

            {/* Holds header menu component */}
            <Menu toggleCart={toggleCart} />

            {/* Cart Slider that user can access to track cart */}
            <CartSlider toggleCart={toggleCart} cartSliderOpen={cartSliderOpen} />

            {/* <Outlet/> where content is injected based on chosen route */}
            <Outlet />

            {/* Default <Toaster /> for toast messages */}
            <Toaster position={'top-right'} containerStyle={{ top: 70, right: 10}} />

        </div>
        </>
    );
}

export default BasePageLayout;