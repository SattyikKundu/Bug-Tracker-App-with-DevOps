// src/ProtectedPages/CreateProjectPage/CreateProjectPage.jsx

import { useState,    // used to stores new-project form values and local validation messages
        useEffect     // used to watch Redux errors and converts them into toast notifications
       } from "react"; 

import { ErrorMessageToast, SuccessMessageToast } from "../../utils/utilityFunctions.jsx"

import { useNavigate } from "react-router"; // sends user to newly-created project after success

import {
  useDispatch, // dispatches createProject Redux thunk
  useSelector  // reads project mutation state
} from "react-redux";

import {
  clearProjectMutationError, // clears stale backend project errors
  createProject              // POST /projects
} from "../../Store/projectSlice.jsx";

import "./CreateProjectPage.css"; // dedicated project-creation styling


const CreateProjectPage = () => {

  const dispatch = useDispatch(); // redux dispatcher
  const navigate = useNavigate(); // programmatic routing helper

  const [formData, setFormData] = useState({ key: "", name: "", description: "" }); // store values entered into the create-project form.

  const {
    mutationStatus, // Tracks create request
    mutationError   // Backend project creation error
  } = useSelector( (state) => state.projects);

   /* Project creation errors are stored in shared Redux state.
    *
    * Display backend error as a toast and then immediately clear it
    * so it can't appear later on CurrentProjectPage or another route.
    */
  useEffect(() => {
    if (!mutationError) { return;  }       // nothing to display

    ErrorMessageToast(mutationError);      // Example: "Project key already exists."

    dispatch(clearProjectMutationError()); // remove stale shared Redux error after toast receives message

  }, [mutationError,dispatch]);


  
  const handleInputChange = (event) => { // update one form property whenever a field changes.
    const { name, value } = event.target;

    setFormData(
      (current) => ({
        ...current,
        [name]:
          name === "key"
            ? value.toUpperCase() // project keys are always uppercase
            : value
      })
    );

    if (mutationError) {
      dispatch(clearProjectMutationError());
    }
  };


  const handleSubmit = async (event) => {  // validate submission and create the project.

    event.preventDefault(); // prevent normal browser form submission
    const normalizedKey = formData.key.trim().toUpperCase();

    // checks to match backend's 2-10 character project-key rule.
    if (!/^[A-Z][A-Z0-9]{1,9}$/.test(normalizedKey)) {
      ErrorMessageToast(
        "Project key must be within 2-10 characters, begin with a letter, and contain only letters or numbers.", 
        3300, 
        'top-center');
      return;
    }

    if (!formData.name.trim()) { // checks if project name is given
      ErrorMessageToast("Project name is required.");
      return;
    }

    const resultAction =
      await dispatch(
        createProject({
          key: normalizedKey,
          name: formData.name.trim(),
          description: formData.description.trim()
        })
      );

    if (createProject.fulfilled.match(resultAction)) { 
      SuccessMessageToast("Project created successfully.");  // remains visible even after navigation occurs
      navigate(`/projects/${resultAction.payload._id}`);     // open newly created project
    }
  };

  return (
    <main className="create-project-page">
      <header className="create-project-heading">
        <p className="create-project-eyebrow">Projects</p>
        <h1>Create Project</h1>
        <p>Create a new workspace for tracking issues, members, assignments, and project activity.</p>
      </header>

      <section className="create-project-card">
        <form className="create-project-form" onSubmit={handleSubmit}>

          <div className="create-project-field">
            <label htmlFor="projectKey">Project Key</label>
            <input
              id          = "projectKey"
              name        = "key"
              value       = {formData.key}
              onChange    = {handleInputChange}
              //minLength="2"
              //maxLength="10"
              placeholder = "BT"
              //required
            />
            <small>A globally unique 2-10 character identifier used in issue keys such as BT-12.</small>
          </div>

          <div className="create-project-field">
            <label htmlFor="projectName">Project Name</label>
            <input
              id          = "projectName"
              name        = "name"
              value       = {formData.name}
              onChange    = {handleInputChange}
              placeholder = "Bug Tracker Application"
              //required
            />
          </div>

          <div className="create-project-field">
            <label htmlFor="projectDescription">Description</label>
            <textarea
              id          = "projectDescription"
              name        = "description"
              value       = {formData.description}
              onChange    = {handleInputChange}
              rows        = "6"
              placeholder = "Describe the purpose of this project..."
            />
          </div>

          <div className="create-project-actions">
            <button
              className = "create-project-secondary-button"
              type      = "button"
              onClick   = {() => navigate("/projects")}
            >
              Cancel
            </button>

            <button
              className = "create-project-primary-button"
              type      = "submit"
              disabled  = { mutationStatus === "loading" }
            >
              {mutationStatus === "loading" ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default CreateProjectPage;