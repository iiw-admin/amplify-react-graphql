import { ThemeProvider, Theme } from '@aws-amplify/ui-react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Amplify, Storage } from 'aws-amplify';
import config from './aws-exports';
Amplify.configure(config);
Storage.configure({
  region: config.aws_user_files_s3_bucket_region,
  bucket: config.aws_user_files_s3_bucket,
  identityPoolId: config.aws_user_pools_id,
  level: "protected",
});


const root = ReactDOM.createRoot(document.getElementById('root'));

const theme: Theme = {
  // name: 'autocomplete-theme',
  // tokens: {
  //   components: {
  //     autocomplete: {
  //       menu: {
  //         option: {
  //           _active: {
  //             backgroundColor: {
  //               value: '#C00',
  //             },
  //           },
  //         },
  //       },
  //     },
  //   },
  // },
};

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme} colorMode="light">
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
