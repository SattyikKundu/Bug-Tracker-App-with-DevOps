// src/ProtectedPages/CreateProjectPage/CreateProjectPage.jsx

import { useState,    // used to stores new-project form values and local validation messages
        useEffect     // used to watch Redux errors and converts them into toast notifications
       } from "react"; 

import { ErrorMessageToast, SuccessMessageToast } from "../../utils/utilityFunctions.jsx"

import { useNavigate } from "react-router"; // Sends user to newly-created project after success

import {
  useDispatch, // Dispatches createProject Redux thunk
  useSelector  // Reads project mutation state
} from "react-redux";

import {
  clearProjectMutationError, // Clears stale backend project errors
  createProject              // POST /projects
} from "../../Store/projectSlice.jsx";

import "./CreateProjectPage.css"; // Dedicated project-creation styling


const CreateProjectPage = () => {

  const dispatch = useDispatch(); // Redux dispatcher
  const navigate = useNavigate(); // Programmatic routing helper

  const [formData, setFormData] = useState({ key: "", name: "", description: "" }); // Store values entered into the create-project form.

  //const [validationError, setValidationError] = useState(""); // Store browser-side validation feedback.

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
    if (!mutationError) { return;  } // Nothing to display

    ErrorMessageToast(mutationError);  // Example: "Project key already exists."

    dispatch(clearProjectMutationError()); // Remove stale shared Redux error after toast receives message

  }, [mutationError,dispatch]);


  
  const handleInputChange = (event) => { // Update one form property whenever a field changes.
    const { name, value } = event.target;

    setFormData(
      (current) => ({
        ...current,
        [name]:
          name === "key"
            ? value.toUpperCase() // Project keys are always uppercase
            : value
      })
    );

    //setValidationError(""); // Clear old client-side validation

    if (mutationError) {
      dispatch(clearProjectMutationError());
    }
  };


  const handleSubmit = async (event) => {  // Validate submission and create the project.

    event.preventDefault(); // Prevent normal browser form submission
    const normalizedKey = formData.key.trim().toUpperCase();

    // Checks to match backend's 2-10 character project-key rule.
    if (!/^[A-Z][A-Z0-9]{1,9}$/.test(normalizedKey)) {
      //setValidationError("Project key must be within 2-10 characters, begin with a letter, and contain only letters or numbers.");
      ErrorMessageToast(
        "Project key must be within 2-10 characters, begin with a letter, and contain only letters or numbers.", 
        3300, 
        'top-center');
      return;
    }

    if (!formData.name.trim()) { // checks if project name is given
      //setValidationError("Project name is required.");
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
      SuccessMessageToast("Project created successfully.");  // Remains visible even after navigation occurs
      navigate(`/projects/${resultAction.payload._id}`);     // Open newly created project
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
              id="projectKey"
              name="key"
              value={formData.key}
              onChange={handleInputChange}
              //minLength="2"
              //maxLength="10"
              placeholder="BT"
              //required
            />
            <small>A globally unique 2-10 character identifier used in issue keys such as BT-12.</small>
          </div>

          <div className="create-project-field">
            <label htmlFor="projectName">Project Name</label>
            <input
              id="projectName"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Bug Tracker Application"
              //required
            />
          </div>

          <div className="create-project-field">
            <label htmlFor="projectDescription">Description</label>
            <textarea
              id="projectDescription"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="6"
              placeholder="Describe the purpose of this project..."
            />
          </div>

          {/* {(validationError || mutationError) && (
            <div className="create-project-alert create-project-alert--error" role="alert">
              {validationError || mutationError}
            </div>
          )} */}

          {/* {validationError && (
            <div className="create-project-alert create-project-alert--error" role="alert" >
              {validationError}
            </div>
          )} */}

          <div className="create-project-actions">
            <button
              className="create-project-secondary-button"
              type="button"
              onClick={() => navigate("/projects")}
            >
              Cancel
            </button>

            <button
              className="create-project-primary-button"
              type="submit"
              disabled={ mutationStatus === "loading" }
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