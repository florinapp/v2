import * as actionTypes from "../actions/types";

const initState = {
  categories: [],
  loading: false,
  failed: false
};

export default (state = initState, action) => {
  let categories;
  switch (action.type) {
    case actionTypes.FETCH_CATEGORIES_SUCCEEDED:
      return {
        ...state,
        categories: action.payload,
        loading: false,
        failed: false
      };
    case actionTypes.FETCH_CATEGORIES_REQUESTED:
      return {
        ...state,
        loading: true,
        failed: false
      };
    case actionTypes.FETCH_CATEGORIES_FAILED:
      return {
        ...state,
        loading: false,
        failed: true
      };
    case actionTypes.CREATE_CATEGORY_SUCCEEDED:
      categories = [...state.categories, action.category]
      categories.sort((a, b) => a._id.localeCompare(b._id))
      return {
        ...state,
        categories
      }
    case actionTypes.DELETE_CATEGORY_SUCCEEDED:
      categories = state.categories.filter(category => category._id !== action.categoryId);
      categories.forEach((category) => {
        if (category.parent === action.categoryId) {
          category.parent = undefined;
        }
      });
      return {
        ...state,
        categories
      }
    default:
      return state;
  }
};
