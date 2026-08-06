import { useState, useEffect } from "react"; // import React library
import { Outlet } from "react-router";

import './BasePageLayout.css';

/* <BasePageLayout> serves as a "wrapper" that provides the necessary 
 * common functions & features to BOTH <PublicPageLayout> (public routes) 
 * and the <ProtectedPageLayout> (private routes). From there, any specializations
 * for the respective page layout can then be added.
 */

const BasePageLayout = () => {

    return (
        <>
        <div className="app-body">
            { /* <Outlet/>: where content is injected based on chosen child public/protected routes */ }
            <Outlet />
        </div>
        </>
    );
}

export default BasePageLayout;