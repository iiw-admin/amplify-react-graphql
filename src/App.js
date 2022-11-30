import { Amplify, API, Auth } from "aws-amplify";
import config from './aws-exports';
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import "./Styles.css";
import {
  BrowserRouter as Router,
  Route,
  Routes,
} from 'react-router-dom';

import React, { useEffect, useState, useContext, useRef } from "react";
import { listMedia } from "./graphql/queries";
import {
  createMedia as createMediaMutation,
  deleteMedia as deleteMediaMutation
} from "./graphql/mutations";
import {
  Badge, Button, Card,
  Flex,
  Heading,
  Link, PasswordField,
  SearchField, Text, TextField, ToggleButton, ToggleButtonGroup,
  View
} from "@aws-amplify/ui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun, faUser, faX } from "@fortawesome/free-solid-svg-icons";
import { MENU_MODES } from "./enums";

Amplify.configure(config);

let searchTimeout = null;

/**
 *
 * @returns {JSX.Element}
 * @constructor
 */
const App = () => {
  const [colorMode, setColorMode] = React.useState('system');
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isAdministrator, setIsAdministrator] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  /*
   * Props
   */

  // Note: Child doesn't rerender unless it's state (not props) changes
  const navProps = {
    colorMode,
    isUserLoggedIn,
    setIsUserLoggedIn,
    setColorMode,
    isAdministrator,
    setIsAdministrator,
  }
  const homeProps = {
    isAdministrator,
    isUserLoggedIn,
  }
  const userMenuProps = {
    colorMode,
    isUserLoggedIn,
    setIsUserLoggedIn,
    setColorMode,
    isAdministrator,
    setIsAdministrator,
    userEmail,
    setUserEmail,
  }

  /*
   * Component
   */

  return (
      <>
        {/*<NavBar props={navProps} />*/}
        <Home {...homeProps} />
        <BumpOut element={<UserMenu {...userMenuProps} />} />
      </>
  )
}

/**
 *
 * @param props
 * @returns {JSX.Element}
 * @constructor
 */
const BumpOut = (props) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [classes, setClasses] = useState(["bumpOut", "slideRight"]);

  useEffect(() => {
    if (menuVisible) {
      setClasses(["bumpOut", "slide", "right"]);
    } else {
      setClasses(["bumpOut", "slide", "right", "hidden"]);
    }
  }, [menuVisible]);

  const bumpOutProps = {
    menuVisible,
    setMenuVisible,
  }

  return (
      <div className={classes.join(" ")}>
        <BumpOutToggle {...bumpOutProps} />
        {props.element}
      </div>
  )
}

/**
 *
 * @param props
 * @returns {JSX.Element}
 * @constructor
 */
const BumpOutToggle = (props) => {
  const toggleVisibility = () => {
    props.setMenuVisible( !props.menuVisible );
  }

  return (
      <View className={"bumpToggle"}>
        <Badge size={"large"} >
          <FontAwesomeIcon icon={props.menuVisible ? faX : faUser} onClick={toggleVisibility} />
        </Badge>
      </View>
  )
}

/**
 *
 * @param props
 * @returns {JSX.Element}
 * @constructor
 */
const UserMenu = (props) => {

  /*
   * Enums
   */

  const MENU_MODES = {
    LOGIN: "LOGIN",
    CONFIRM_ACCOUNT: "CONFIRM_ACCOUNT",
    RESET_PASSWORD: "RESET_PASSWORD",
    LOGGED_IN: "LOGGED_IN",
    ACCOUNT_MANAGEMENT: "ACCOUNT_MANAGEMENT",
  }

  /*
   * States
   */

  const [loginError, setLoginError] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isAccountConfirmed, setIsAccountConfirmed] = useState(false);
  const [usernameFieldValue, setUsernameFieldValue] = useState("");
  const [passwordFieldValue, setPasswordFieldValue] = useState("");
  const [loginErrorValue, setLoginErrorValue] = useState("");
  const [menuMode, setMenuMode] = useState(MENU_MODES.LOGIN);

  /*
   * Effects
   */

  // Check if the user is already logged in
  useEffect(() => {
    Auth.currentAuthenticatedUser()
        .then( user => {
          props.setIsUserLoggedIn(true);
          console.log(`👍 Already signed in!\n\t- Email: ${user.attributes.email}\n\t- Group: ${user.signInUserSession.accessToken.payload["cognito:groups"]}`);
        })
        .catch( err => {
          console.log(`👎 Not signed in yet`);
        });
  });

  // Confirm the verification code when entered
  useEffect(() => {
    if (verificationCode.length === 6) {
      console.log(`Checking Verification Code ${verificationCode}`);
      Auth.confirmSignUp(props.userEmail, verificationCode)
          .then( () => {
            setIsAccountConfirmed(true);
            props.setIsUserLoggedIn(true);
            setMenuMode( MENU_MODES.LOGGED_IN );
          })
          .catch( error => {
            console.log('error confirming sign up', error);
          });
    }
  }, [verificationCode]);

  function signUp() {
    Auth
        .signUp( {
          username: usernameFieldValue,
          password: passwordFieldValue,
          autoSignIn: { // optional - enables auto sign in after user is confirmed
            enabled: true,
          }
        } )
        .then( user => {
          props.setIsUserLoggedIn( true );
          setMenuMode( MENU_MODES.CONFIRM_ACCOUNT );
          console.log( '👍 User signed up successfully!', user )
        } )
        .catch( error => {
          console.log( 'error signing up:', error );
          /* Possible errors:
           * UsernameExistsException: An account with the given email already exists.
           * InvalidPasswordException: Password did not conform with policy: Password not long enough
           * UserNotConfirmedException: User is not confirmed.
           */
          switch( error.name ) {
            case "UsernameExistsException":
              setLoginError( "That email is already in use." );
              break;
            default:
              break;
          }
        } );
  }

  function signIn() {
    Auth.signIn( usernameFieldValue, passwordFieldValue )
        .then( ( user ) => {
          props.setIsUserLoggedIn( true );
          props.setIsAdministrator( user.signInUserSession.accessToken.payload["cognito:groups"].includes( "Administrators" ) );
          setUsernameFieldValue( "" );
          setPasswordFieldValue( "" );
          setMenuMode( MENU_MODES.LOGGED_IN );
          console.log( "🎉 Logged in!" );
        } )
        .catch( error => {
          console.log( "Sign in error", JSON.stringify( error ), error.toString() );
          switch( error.name ) {
            case "NotAuthorizedException":
              if( error.toString().indexOf( "User is disabled" ) > -1 ) {
                setLoginError( "Account disabled." );
              } else {
                setLoginError( "Incorrect username or password." );
              }
              break;
            case "UserNotFoundException":
              setLoginError( "Incorrect username or password." );
              break;
            case "UserNotConfirmedException":
              console.log( "⚙️ Account is not confirmed" );
              break;
            default:
              break;
          }
          console.log( '😢 Error signing in', error );
        } );
  }

  function signOut() {
    Auth.signOut()
        .then( () => {
          setMenuMode( MENU_MODES.LOGIN );
          props.setIsUserLoggedIn( false );
          console.log('👋🏼 Signed out. Bye!');
        } )
        .catch( error => {
          console.log('💫 Error signing out: ', error);
        });
  }

  function resendConfirmationCode() {
    Auth.resendSignUp( usernameFieldValue )
        .then(() => {
          // TODO: ???
        });
  }

  const manageAccountOnClick = () => {
    setMenuMode( MENU_MODES.ACCOUNT_MANAGEMENT );
  }

  return (
      <View id={"menu"} key={"userPopoutMenu"}>
        <Flex direction={"column"} alignItems={"left"}>
          {
            {
              [MENU_MODES.LOGIN]: (
                  <>
                    <TextField
                        name="login_username"
                        key={"login_username"}
                        placeholder="Email"
                        label="Your Email Address"
                        labelHidden
                        variation="quiet"
                        required
                        value={usernameFieldValue}
                        onChange={(event) => { event.preventDefault(); setUsernameFieldValue(event.target.value); }}
                    />
                    <PasswordField
                        name="login_password"
                        key={"login_password"}
                        placeholder="Password"
                        label="Your Password"
                        labelHidden
                        variation="quiet"
                        required
                        value={passwordFieldValue}
                        onChange={(event) => { event.preventDefault(); setPasswordFieldValue(event.target.value); }}
                    />
                    <Text>{loginErrorValue}</Text>
                    <Button onClick={signIn}>Sign In</Button>
                    <Button onClick={signUp}>Create Account</Button>
                    <Text>Forgot Password</Text>
                  </>
              ),
              [MENU_MODES.CONFIRM_ACCOUNT]: (
                  <View>
                    <Text>A confirmation code has been sent to {props.userEmail}. Enter it below to confirm your account and log in.</Text>
                    <TextField
                        name="verification_code"
                        placeholder="Verification Code"
                        label="Verification Code"
                        labelHidden
                        variation="quiet"
                        required
                        value={verificationCode}
                        onChange={(event) => setVerificationCode(event.target.value)}
                    />
                  </View>
              ),
              [MENU_MODES.RESET_PASSWORD]: (<></>),
              [MENU_MODES.LOGGED_IN]: (
                  <>
                    <>{props.userEmail}</>
                    <Text onClick={manageAccountOnClick}>Manage Account</Text>
                    <Button onClick={signOut}>Sign Out</Button>
                    <Card>
                      <ToggleButtonGroup
                          value={props.colorMode}
                          isExclusive
                          onChange={(value) => props.setColorMode(value)}
                      >
                        <ToggleButton value="light">Light</ToggleButton>
                        <ToggleButton value="dark">Dark</ToggleButton>
                        <ToggleButton value="system">System</ToggleButton>
                      </ToggleButtonGroup>
                    </Card>
                  </>
              ),
              [MENU_MODES.ACCOUNT_MANAGEMENT]: (
                  <>Account</>
              ),
            }[menuMode]
          }
        </Flex>
      </View>
  )
}

/**
 *
 * @param props
 * @returns {JSX.Element}
 * @constructor
 */
const Home = (props) => {
  /*
   * Constants
   */
  const maxSearchResults = 5;
  // const theme = {
  //   name: 'my-theme',
  //   overrides: [defaultDarkModeOverride],
  // };


  /*
   * Search
   */
  const [titles, setTitles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const isAdministrator = props.isAdministrator;

  /*
   * Account and Login
   */

  // This variable should only be used for insecure tasks, such as determineing
  // whether to show the *option* to delete a media entry. The user
  // should be looked up from the server again to determine whether or not it
  // actually has permission to perform the action.

  /*
   * Page control
   */

  useEffect(() => {
    if( searchTimeout ) {
      clearTimeout( searchTimeout );
    }
    searchTimeout = setTimeout(() => {
      if( searchTerm ) {
        fetchTitles()
            .then(() => {
              console.log("Done fetching titles");
            })
      }
    }, 300);
  }, [searchTerm]);

  /*
   * Authentication
   */

  /*
   * Media Management
   */

  async function fetchTitles() {
    const apiData = await API.graphql({ query: listMedia });
    const itemsFromAPI = apiData.data.listMedia.items;
    setTitles(itemsFromAPI);

    console.log("📡 API Data", apiData);
  }

  async function createMedia() {
    if( !searchTerm ) {
      return;
    }

    console.log(`➕Adding ${searchTerm} to the database`);
    const data = {
      title: searchTerm,
    };
    await API.graphql({
      query: createMediaMutation,
      variables: { input: data },
    });
    fetchTitles();
  }

  const deleteMedia = (mediaId) => {
    console.log( "Deleting media ID", mediaId);
    const data = {
      id: mediaId
    };
    Auth.currentAuthenticatedUser()
        .then( user => {
          console.log("❓Verifying user is authorized to delete media...");
          const isAdmin = user.signInUserSession.accessToken.payload["cognito:groups"].includes("Administrators")
          if( !isAdmin ) {
            console.log("❌ You must be an administrator to delete media.");
            throw "Unauthorized Delete Attempt";
          }
          console.log("👍 User is authorized to delete media.");
          return API.graphql({
            query: deleteMediaMutation,
            variables: { input: data },
          });
        })
        .then( deleteResult => {
          if( ( deleteResult.data?.errors || [] ).length ) {
            throw deleteResult.data.errors[0].message;
          }
          console.log("✅ Deleted media.");

          const newTitles = titles.filter( title => title.id !== mediaId );
          setTitles( newTitles );
        })
        .catch( error => {
          console.log( "Error deleting media", error );
        });
  }

  const searchFilter = ( title, index ) => {
    if( !searchTerm ) {
      return false;
    }
    return title.title.toLowerCase().includes( searchTerm.toLowerCase() );
  }

  const searchSort = (a, b) => {
    return 1;
  }

  const searchMap = searchResult => {
    return (
        <SearchResult key={searchResult.id} {...searchResult} />
    )
  };

  const SearchResults = (props) => {
    return (
        <Flex id="searchResults" justifyContent={"center"} direction={"column"}>
          {
            props.searchResults
                .filter( searchFilter )
                .sort( searchSort )
                .filter( (title, index) => index < maxSearchResults )  // Limit to 5 results
                .map( searchMap )
          }
        </Flex>
    )
  };

  const SearchResult = (props) => {
    console.log("isAdministrator", isAdministrator)
    const matchIndex = props.title.search(new RegExp(searchTerm, "i"));
    return (
        <Flex direction={"row"} justifyContent={"center"} className={"nogap searchResult"}>
          { isAdministrator
              ? ( <View onClick={() => deleteMedia(props.id)}><FontAwesomeIcon icon={faX} /></View> )
              : null
          }
          {props.title.substring(0, matchIndex)}
          <span className={"searchHighlight"}>{props.title.substring(matchIndex, matchIndex + searchTerm.length)}</span>
          {props.title.substring(matchIndex + searchTerm.length)}
        </Flex>
    )
  }

  return (
      <>
        <Flex id="content" direction="column" alignItems="center" justifyContent="center">
          <Heading level={1}>Title!</Heading>
          <SearchField
              label="Search"
              placeholder="Search"
              hasSearchButton={false}
              hasSearchIcon={true}
              onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Flex>
        { props.isUserLoggedIn && searchTerm
            ? <Link className={"searchResult"} onClick={createMedia}>Add to Database</Link>
            : null
        }
        <SearchResults searchResults={titles} />
      </>
  )
}

// const NavBar = (props) => {
//   // This line of code is stupid and I don't know why it's required, but it is.
//   props = props.props;
//
//   const [menuMode, setMenuMode] = useState( MENU_MODES.LOGIN )
//   const [showMenu, setShowMenu] = useState(false)
//   const [password, setPassword] = useState("");
//   const [loginError, setLoginError] = useState(null);
//   const [verificationCode, setVerificationCode] = useState("");
//   const [isAccountConfirmed, setIsAccountConfirmed] = useState(false);
//   const [loggedInUserEmail, setLoggedInUserEmail] = useState("");
//
//   const menuReference = useRef(null)
//   const closeOpenMenus = (e)=> {
//     if( menuReference.current && showMenu && !menuReference.current.contains( e.target ) ) {
//       setShowMenu( false )
//     }
//   }
//
//   useEffect(() => {
//     onAppLoad().then(() => {});
//   });
//   useEffect(() => {
//     if (verificationCode.length === 6) {
//       console.log(`Checking Verification Code ${verificationCode}`);
//       try {
//         Auth.confirmSignUp(loggedInUserEmail, verificationCode).then( () => {
//           setIsAccountConfirmed(true);
//           props.setIsUserLoggedIn(true);
//           setMenuMode( MENU_MODES.AUTHENTICATED );
//         });
//       } catch (error) {
//         console.log('error confirming sign up', error);
//       }
//     }
//   }, [verificationCode]);
//
//   async function signUp() {
//     try {
//       const { user } = await Auth.signUp({
//         username: userEmail,
//         password,
//         autoSignIn: { // optional - enables auto sign in after user is confirmed
//           enabled: true,
//         }
//       });
//       setIsAccountConfirmed(false);
//       setLoggedInUserEmail( user.username );
//       props.setIsUserLoggedIn( true );
//       setMenuMode( MENU_MODES.CONFIRM_ACCOUNT );
//     } catch (error) {
//       console.log('error signing up:', error);
//       /* Possible errors:
//        * UsernameExistsException: An account with the given email already exists.
//        * InvalidPasswordException: Password did not conform with policy: Password not long enough
//        * UserNotConfirmedException: User is not confirmed.
//        */
//       switch( error.name ) {
//         case "UsernameExistsException":
//           setLoginError("That email is already in use.");
//           break;
//         default:
//           break;
//       }
//     }
//   }
//
//   function signIn() {
//     try {
//       Auth.signIn(username, password).then( (user) => {
//         props.setIsUserLoggedIn(true);
//         setLoggedInUserEmail( user.attributes.email );
//         setMenuMode( MENU_MODES.AUTHENTICATED );
//         setUsername("");
//         setPassword("");
//         props.setIsAdministrator( user.signInUserSession.accessToken.payload["cognito:groups"].includes("Administrators") );
//         console.log("🎉 Logged in!");
//       });
//     } catch (error) {
//       console.log( "error", JSON.stringify( error ), error.toString() );
//       switch( error.name ) {
//         case "NotAuthorizedException":
//           if( error.toString().indexOf( "User is disabled" ) > -1 ) {
//             setLoginError("Account disabled.");
//           } else {
//             setLoginError("Incorrect username or password.");
//           }
//           break;
//         case "UserNotFoundException":
//           setLoginError("Incorrect username or password.");
//           break;
//         case "UserNotConfirmedException":
//           setMenuMode( MENU_MODES.CONFIRM_ACCOUNT );
//           setLoggedInUserEmail( username );
//           setIsAccountConfirmed(false);
//           resendConfirmationCode();
//           console.log("⚙️ Sending Confirmation Code");
//           break;
//         default:
//           break;
//       }
//       console.log('😢 Error signing in', error);
//     }
//   }
//
//   async function signOut() {
//     try {
//       await Auth.signOut();
//       setIsAccountConfirmed( false );
//       setLoggedInUserEmail( null );
//       props.setIsUserLoggedIn( false );
//       setMenuMode( MENU_MODES.LOGIN );
//       console.log('👋🏼 Signed out. Bye!');
//     } catch (error) {
//       console.log('💫 Error signing out: ', error);
//     }
//   }
//
//   async function resendConfirmationCode() {
//     try {
//       await Auth.resendSignUp(username);
//     } catch (err) {
//       // TODO ????
//     }
//   }
//
//   async function onAppLoad() {
//     try {
//       const user = await Auth.currentAuthenticatedUser();
//       setIsAccountConfirmed( user.attributes.email_verified );
//       setLoggedInUserEmail( user.attributes.email );
//       props.setIsUserLoggedIn(true);
//       setMenuMode( MENU_MODES.AUTHENTICATED );
//       props.setIsAdministrator( user.signInUserSession.accessToken.payload["cognito:groups"].includes("Administrators") );
//       console.log(`👍 Already signed in!\n\t- Email: ${user.attributes.email}\n\t- Group: ${user.signInUserSession.accessToken.payload["cognito:groups"]}`);
//     } catch {
//       // Do nothing
//     }
//   }
//
//   document.addEventListener('mousedown',closeOpenMenus)
//
//   return (
//       <>
//         <Flex id="navigation" direction="column" wrap="nowrap" alignItems="flex-end">
//           <View id={"userBadge"}>
//             <Badge size={"large"} onClick={() => setShowMenu(!showMenu)}>
//               <FontAwesomeIcon icon={faUser} />
//             </Badge>
//           </View>
//           { showMenu ? (
//               <View id={"menu"} ref={menuReference} key={"userPopoutMenu"}>
//                 <Flex direction={"column"} alignItems={"left"}>
//                   <View id={"darkModeToggle"}>
//                     <Badge size={"large"} >
//                       <FontAwesomeIcon icon={props.colorMode === "dark" ? faSun : faMoon} />
//                     </Badge>
//                   </View>
//                   {
//                     {
//                       [MENU_MODES.LOGIN]: (
//                           <>
//                             <TextField
//                                 name="login_username"
//                                 key={"login_username"}
//                                 placeholder="Email"
//                                 label="Your Email Address"
//                                 labelHidden
//                                 variation="quiet"
//                                 required
//                                 value={username}
//                                 onChange={(event) => { event.preventDefault(); setUsername(event.target.value); }}
//                             />
//                             <PasswordField
//                                 name="login_password"
//                                 key={"login_password"}
//                                 placeholder="Password"
//                                 label="Your Password"
//                                 labelHidden
//                                 variation="quiet"
//                                 required
//                                 value={password}
//                                 onChange={(event) => { event.preventDefault(); setPassword(event.target.value); }}
//                             />
//                             <Text>{loginError}</Text>
//                             <Button onClick={signIn}>Sign In</Button>
//                             <Button onClick={signUp}>Create Account</Button>
//                             <Text>Forgot Password</Text>
//                           </>
//                       ),
//                       [MENU_MODES.CONFIRM_ACCOUNT]: (
//                           <View>
//                             <Text>A confirmation code has been sent to {username}. Enter it below to confirm your account and log in.</Text>
//                             <TextField
//                                 name="verification_code"
//                                 placeholder="Verification Code"
//                                 label="Verification Code"
//                                 labelHidden
//                                 variation="quiet"
//                                 required
//                                 value={verificationCode}
//                                 onChange={(event) => setVerificationCode(event.target.value)}
//                             />
//                           </View>
//                       ),
//                       [MENU_MODES.RESET_PASSWORD]: (<></>),
//                       [MENU_MODES.AUTHENTICATED]: (
//                           <>
//                             <>{loggedInUserEmail}</>
//                             <Link href={"/account"}>Manage Account</Link>
//                             <Button onClick={signOut}>Sign Out</Button>
//                             <Card>
//                               <ToggleButtonGroup
//                                   value={props.colorMode}
//                                   isExclusive
//                                   onChange={(value) => props.setColorMode(value)}
//                               >
//                                 <ToggleButton value="light">Light</ToggleButton>
//                                 <ToggleButton value="dark">Dark</ToggleButton>
//                                 <ToggleButton value="system">System</ToggleButton>
//                               </ToggleButtonGroup>
//                             </Card>
//                           </>
//                       ),
//                     }[menuMode]
//                   }
//                 </Flex>
//               </View>
//           ) : null }
//         </Flex>
//       </>
//   )
// }

const Account = (props) => {
  return (
      <>Your Account</>
  )
}

const Contribute = (props) => {
  return (
      <>You're contributing!</>
  )
}

export default App;
