const uuid = require('uuid');

const User = require('../models/user');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse');


exports.register = asyncHandler(async (req, res, next) => {


    const { name, email, password } = req.body;

    const apiKey = uuid.v4()

    const user = await User.create({
        name,
        email,
        password,
        apiKey,

    })

    const token = user.generateJwtToken();

    res.status(201).json({ success: true, data: user, token });

});



exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if(!email || !password){
        return next(new ErrorResponse('Please provide an email and password', 400));
    }

    const user = await User.findOne({ email });

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    const isMatch = await user.checkPassword(password);

    if (!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    const token = user.generateJwtToken()

    res.status(200).json({
        success: true,
        data: {
            user,
        },
        token
    });
});

// @desc      Get profile user
// @route     GET /api/v1/auth/profile
// @access    Private
exports.getProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id)

  res.status(200).json({
    success: true,
    data: user
  })
})

// @desc      Update profile
// @route     PUT /api/v1/auth/update
// @access    Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id)
  const fieldsToUpdate = {
    name: req.body.name || user.name,
    email: req.body.email || user.email
  }

  const updatedUser = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, {
    new: true,
    runValidators: true
  })

  res.status(200).json({
    success: true,
    data: updatedUser
  })
})

// @desc      Update password
// @route     PUT /api/v1/auth/updatepassword
// @access    Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id)
  
  //Check current password
  if(!(await user.matchPassword(req.body.currentPassword))){
    return next(new ErrorResponse('Old password is incorrect', 400))
  }

  user.password = req.body.newPassword;
  await user.save()

  const token = user.generateJwtToken()

  res.status(200).json({
    success: true,
    data: user,
    token
  })
})

// @desc      Payment Balance
// @route     PUT /api/v1/auth/paymentBalance
// @access    Private
exports.paymentBalance = asyncHandler(async (req, res, next) => {
  //CLICK, PAYME
  const user = await User.findById(req.user._id)

  const updatedUser = await User.findByIdAndUpdate(req.user._id, 
    { balance: (user.balance + req.body.payment) },
    { new: true }  
  )

  res.status(200).json({
    success: true,
    data: updatedUser
  })
})

// @desc      Activate Status
// @route     PUT /api/v1/auth/activate
// @access    Private
exports.activateProfile = asyncHandler(async (req, res, next) => {
  const apiCost = process.env.API_COST
  
  const user = await User.findById(req.user._id)

  if(user.balance < apiCost){
    let needMoney = apiCost - user.balance
    return next(new ErrorResponse(`Your balance is less than ${apiCost}. You need ${needMoney} more`, 400))
  }

  await User.findByIdAndUpdate(req.user._id, 
    { balance: (user.balance - apiCost), isActive: true },
    { new: true, runValidators: true }  
  )

  res.status(200).json({
    success: true,
    message: 'Your profile successfully activated'
  })
})



