import React, { useState, FormEvent, useEffect } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CssBaseline from "@mui/material/CssBaseline";
import FormControlLabel from "@mui/material/FormControlLabel";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import FormLabel from "@mui/material/FormLabel";
import FormControl from "@mui/material/FormControl";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Card from "../Components/Card.ts";
import { styled } from "@mui/material/styles";
import ForgotPassword from "./ForgotPassword.tsx";
import { SitemarkIcon } from "./CustomIcons.tsx";
import {
  login,
  register,
  LoginModel,
  RegisterModel,
} from "../Services/authService.ts";
import "./login.css";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess } from '../store/authSlice.ts';
import { RootState } from "../Utils/PrivateRoute.tsx";
import { useNavigate } from "react-router-dom";

const SignInContainer = styled(Stack)(({ theme }) => ({
  height: "calc((1 - var(--template-frame-height, 0)) * 100dvh)",
  minHeight: "100%",
  padding: theme.spacing(2),
  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(4),
  },
  "&::before": {
    content: '""',
    display: "block",
    position: "absolute",
    zIndex: -1,
    inset: 0,
    backgroundImage:
      "radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))",
    backgroundRepeat: "no-repeat",
    ...theme.applyStyles("dark", {
      backgroundImage:
        "radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))",
    }),
  },
}));

export default function SignInSignUp() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat');
    }
  }, [isAuthenticated, navigate]);

  const [isSignUp, setIsSignUp] = useState(false);
  
  // State for form inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const [openErrorMessage, setOpenErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorStatus, setErrorStatus] = useState("");

  // State for input errors
  const [emailError, setEmailError] = useState(false);
  const [emailShake, setEmailShake] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [passwordShake, setPasswordShake] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");
  const [usernameError, setUsernameError] = useState(false);
  const [usernameShake, setUsernameShake] = useState(false);
  const [usernameErrorMessage, setUsernameErrorMessage] = useState("");

  const [open, setOpen] = useState(false);

  const handleCloseErrorMessage = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setOpenErrorMessage(false);
  };

  const triggerError = (message: string, status:string) => {
    setErrorMessage(message);
    setErrorStatus(status)
    setOpenErrorMessage(true);
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const validateInputs = () => {
    let isValid = true;

    const validateEmailFormat = (email_data: string) =>
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email_data);

    const validatePassword = (password_data: string) => {
      let hasMinLen = false;
      let hasUpper = false;
      let hasLower = false;
      let hasNumber = false;
      let hasSpecial = false;

      // Check minimum length
      if (password_data.length >= 8) {
        hasMinLen = true;
      }

      // Iterate over each character in the password
      for (const char of password_data) {
        if (/[A-Z]/.test(char)) {
          hasUpper = true;
        } else if (/[a-z]/.test(char)) {
          hasLower = true;
        } else if (/[0-9]/.test(char)) {
          hasNumber = true;
        } else if (/[\p{P}\p{S}]/u.test(char)) {
          // Check for punctuation or symbols using Unicode properties
          hasSpecial = true;
        }
      }

      // Check all conditions
      return hasMinLen && hasUpper && hasLower && hasNumber && hasSpecial;
    };

    const validateEmail = (emailData: string, isSignUpValue: boolean) => {
      if (!emailData) return "Please enter a valid email address.";
      if (isSignUpValue && !validateEmailFormat(emailData))
        return "Please enter a valid email address.";
      if (!isSignUpValue && emailData.length < 3)
        return "Email must be at least 3 characters long.";
      return "";
    };


    const errorMessage = validateEmail(email, isSignUp);

    if (errorMessage) {
      emailErrorImpl(errorMessage);
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage("");
    }

    // Password validation
    if (!password || !validatePassword(password)) {
      var messagePassword =
        "Password " +
        (isSignUp ? "must" : "should") +
        " be 8+ characters with uppercase, lowercase, number, and special character";
      passwordErrorImpl(messagePassword);
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage("");
    }

    // Username validation (only for signup)
    if (isSignUp) {
      if (!username || username.length < 3) {
        var usernameMessage = "Username must be at least 3 characters long.";
        usernameErrorImpl(usernameMessage);
        isValid = false;
      } else {
        setUsernameError(false);
        setUsernameErrorMessage("");
      }
    }

    return isValid;
  };

  const handleErrorField = (field: string, message: string) => {
    switch (field) {
      case "email":
        emailErrorImpl(message);
        break;
      case "password":
        passwordErrorImpl(message);
        break;
      case "unauthorized":
        emailErrorImpl("");
        passwordErrorImpl(message);
        break;
      default:
        emailErrorImpl(message);
        break;
    }
  };

  function emailErrorImpl(message: string) {
    setEmailError(true);
    setEmailShake(true);
    setTimeout(() => {
      setEmailShake(false);
    }, 500);
    setEmailErrorMessage(capitalizeFirstLetter(message));
  }
  function passwordErrorImpl(message: string) {
    setPasswordError(true);
    setPasswordShake(true);
    setTimeout(() => {
      setPasswordShake(false);
    }, 500);
    setPasswordErrorMessage(capitalizeFirstLetter(message));
  }
  function usernameErrorImpl(message: string) {
    setUsernameError(true);
    setUsernameShake(true);
    setTimeout(() => {
      setUsernameShake(false);
    }, 500);
    setUsernameErrorMessage(capitalizeFirstLetter(message));
  }

  function capitalizeFirstLetter(val: string) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    resetErrors();

    // Validate inputs first
    if (!validateInputs()) {
      return;
    }

    if (isSignUp) {
      const registerPayload: RegisterModel = {
        email: email,
        username: username,
        password: password,
      };
      try {
        const registerToken = await register(registerPayload);
        if ("token" in registerToken) {
          triggerError('Registration successful! You have been logged in automatically.', "success")
          //set loginToken.token and loginToken.expiration and email to store
          dispatch(loginSuccess({
            user: email,
            token: registerToken.token,
            expiration: registerToken.expiration,
          }));
        } else if (registerToken.fieldError && registerToken.error) {
          handleErrorField(registerToken.fieldError, registerToken.error);
        } else {
          triggerError('Something went wrong : '+ registerToken.error, "error")
        }
      } catch (err) {
        triggerError('Something went wrong : '+ err, "error")
      }
    } else {
      const loginPayload: LoginModel = {
        email: email,
        password: password,
      };
      try {
        const loginToken = await login(loginPayload);
        if ("token" in loginToken) {
          triggerError('Login success!', "success")

          //set loginToken.token and loginToken.expiration and email to store
          dispatch(loginSuccess({
            user: email,
            token: loginToken.token,
            expiration: loginToken.expiration,
          }));
          //navigate('/chat');
        } else if (loginToken.fieldError && loginToken.error) {
          handleErrorField(loginToken.fieldError, loginToken.error);
        } else {
          triggerError('Something went wrong : '+ loginToken.error, "error")
        }
      } catch (err) {
        triggerError('Something went wrong : '+ err, "error")
      }
    }
  };

  const resetErrors = () => {
    setEmailError(false);
    setEmailErrorMessage("");
    setPasswordError(false);
    setPasswordErrorMessage("");
    setUsernameError(false);
    setUsernameErrorMessage("");
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);

    setEmail("");
    setPassword("");
    setUsername("");
    resetErrors();
  };

  return (
    <>
      <CssBaseline enableColorScheme />
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        open={openErrorMessage}
        autoHideDuration={2500}
        onClose={handleCloseErrorMessage}
      >
        <Alert onClose={handleCloseErrorMessage} severity={errorStatus === "error" ? "error":"success"} sx={{ width: "100%" }}>
          {errorMessage}
        </Alert>
      </Snackbar>
      <SignInContainer direction="column" justifyContent="space-between">
        <Card variant="outlined">
          <SitemarkIcon />
          <Typography
            component="h1"
            variant="h4"
            sx={{ width: "100%", fontSize: "clamp(2rem, 10vw, 2.15rem)" }}
          >
            {isSignUp ? "Sign Up" : "Sign In"}
          </Typography>
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              gap: 2,
            }}
          >
            <FormControl>
              <FormLabel htmlFor="email">
                {isSignUp ? "Email" : "Email / Username"}
              </FormLabel>
              <TextField
                error={emailError}
                helperText={emailErrorMessage}
                id="email"
                type="email"
                name="email"
                placeholder={
                  isSignUp
                    ? "your@email.com"
                    : "your@email.com or your_username"
                }
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
                fullWidth
                variant="outlined"
                color={emailError ? "error" : "primary"}
                className={emailShake ? "shake" : ""}
              />
            </FormControl>

            {isSignUp && (
              <FormControl>
                <FormLabel htmlFor="username">Username</FormLabel>
                <TextField
                  error={usernameError}
                  helperText={usernameErrorMessage}
                  id="username"
                  type="text"
                  name="username"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  fullWidth
                  variant="outlined"
                  color={usernameError ? "error" : "primary"}
                  className={usernameShake ? "shake" : ""}
                />
              </FormControl>
            )}

            <FormControl>
              <FormLabel htmlFor="password">Password</FormLabel>
              <TextField
                error={passwordError}
                helperText={passwordErrorMessage}
                name="password"
                placeholder="••••••••"
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                autoFocus
                required
                fullWidth
                variant="outlined"
                color={passwordError ? "error" : "primary"}
                className={passwordShake ? "shake" : ""}
              />
            </FormControl>

            {!isSignUp && (
              <FormControlLabel
                control={<Checkbox value="remember" color="primary" />}
                label="Remember me"
              />
            )}

            <ForgotPassword open={open} handleClose={handleClose} />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                backgroundColor: isSignUp ? "green" : "primary.main",
                "&:hover": {
                  backgroundColor: isSignUp ? "darkgreen" : "primary.dark",
                },
              }}
            >
              {isSignUp ? "Sign Up" : "Sign In"}
            </Button>

            {!isSignUp && (
              <Link
                component="button"
                type="button"
                onClick={handleClickOpen}
                variant="body2"
                sx={{ alignSelf: "center" }}
              >
                Forgot your password?
              </Link>
            )}
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Divider>or</Divider>

            <Typography sx={{ textAlign: "center" }}>
              {isSignUp
                ? "Already have an account? "
                : "Don't have an account? "}
              <Link
                component="button"
                type="button"
                onClick={toggleAuthMode}
                variant="body2"
                sx={{ alignSelf: "center" }}
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </Link>
            </Typography>
          </Box>
        </Card>
      </SignInContainer>
    </>
  );
}
